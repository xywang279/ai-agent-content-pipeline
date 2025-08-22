from fastapi import APIRouter, WebSocket, HTTPException, WebSocketDisconnect
from pydantic import BaseModel
from typing import Optional, List
import json
import uuid
from datetime import datetime
import asyncio

from app.utils.llm_helper import llm_helper
from app.utils.conversation_manager import conversation_manager
from app.utils.memory_manager import MemoryManager
memory_manager = MemoryManager()
memory_manager.create_or_load()


router = APIRouter(prefix="/chat", tags=["chat"])

class ChatMessageRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None

class ChatMessageResponse(BaseModel):
    message_id: str
    content: str
    conversation_id: str
    role: str
    timestamp: str

class ConversationCreateRequest(BaseModel):
    title: Optional[str] = None

class ConversationResponse(BaseModel):
    id: str
    title: str
    created_at: str
    updated_at: str
    message_count: int

class ConversationListResponse(BaseModel):
    conversations: List[ConversationResponse]

def _now():
    return datetime.utcnow().isoformat()

def _safe_llm_content(response):
    try:
        return response["choices"][0]["message"]["content"]
    except Exception:
        return ""

@router.post("/", response_model=ChatMessageResponse)
async def send_chat_message(request: ChatMessageRequest):
    """发送聊天消息"""
    try:
        conversation_id = request.conversation_id or conversation_manager.create_conversation()
        user_message = {
            "id": str(uuid.uuid4()),
            "role": "user",
            "content": request.message,
            "timestamp": _now()
        }
        conversation_manager.add_message(conversation_id, user_message)
        messages = conversation_manager.get_messages(conversation_id)
        formatted_messages = [{"role": msg["role"], "content": msg["content"]} for msg in messages]
        response = await llm_helper.chat_completion(messages=formatted_messages, temperature=0.7)
        ai_content = _safe_llm_content(response)
        ai_message = {
            "id": str(uuid.uuid4()),
            "role": "assistant",
            "content": ai_content,
            "timestamp": _now()
        }
        conversation_manager.add_message(conversation_id, ai_message)
        return ChatMessageResponse(
            message_id=ai_message["id"],
            content=ai_content,
            conversation_id=conversation_id,
            role="assistant",
            timestamp=ai_message["timestamp"]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"发送消息失败: {str(e)}")

async def _safe_send(websocket: WebSocket, message: dict, chunk_size: int = 2000):
    """安全发送，避免单条消息过大"""
    text = json.dumps(message, ensure_ascii=False)
    for i in range(0, len(text), chunk_size):
        await websocket.send_text(text[i:i + chunk_size])
@router.websocket("/ws")
async def websocket_chat(websocket: WebSocket):
    """WebSocket 实时聊天（保持流式响应 + 心跳 + finally close）"""
    await websocket.accept()
    try:
        while True:
            # 两个任务：接收消息 / 心跳
            data_task = asyncio.create_task(websocket.receive_text())
            heartbeat_task = asyncio.create_task(asyncio.sleep(30))  # 30 秒心跳

            done, pending = await asyncio.wait(
                {data_task, heartbeat_task},
                return_when=asyncio.FIRST_COMPLETED,
            )

            if data_task in done:
                # 收到用户消息
                data = data_task.result()
                message_data = json.loads(data)

                if message_data.get("type") == "user_message":
                    message = message_data.get("content", "")
                    conversation_id = (
                        message_data.get("conversation_id")
                        or conversation_manager.create_conversation()
                    )

                    #1  保存用户消息到短期和长期记忆
                    user_message = {
                        "id": str(uuid.uuid4()),
                        "role": "user",
                        "content": message,
                        "timestamp": _now(),
                    }
                    conversation_manager.add_message(conversation_id, user_message)
                    memory_manager.add_texts([user_message["content"]])

                    # 2. 检索长期记忆
                    long_term_results = memory_manager.search(message, k=3)
                    long_term_context = "\n".join([doc.page_content for doc in long_term_results])
                    # 3. 取短期记忆
                    N = 10
                    short_term_messages = conversation_manager.get_messages(conversation_id)[-N:]
                    short_term_context = [{"role": msg["role"], "content": msg["content"]} for msg in short_term_messages]

                                        # 4. 拼接上下文
                    if long_term_context:
                        system_prompt = f"【长期记忆相关内容】\n{long_term_context}\n【当前对话】"
                        formatted_messages = [{"role": "system", "content": system_prompt}] + short_term_context
                    else:
                        formatted_messages = short_term_context
                    # messages = conversation_manager.get_messages(conversation_id)
                    # formatted_messages = [
                    #     {"role": msg["role"], "content": msg["content"]}
                    #     for msg in messages
                    # ]

                    # 通知前端开始流
                    await websocket.send_text(json.dumps({
                        "type": "stream_start",
                        "message": "开始生成回复..."
                    }))

                    full_response = ""

                    try:
                        # ⚡ 流式返回
                        async for chunk in llm_helper.chat_completion_stream(
                            messages=formatted_messages,
                            temperature=0.7,
                        ):
                            if chunk.get("type") == "stream_chunk":
                                content = chunk.get("content", "")
                                if content:
                                    full_response += content
                                    await websocket.send_text(json.dumps({
                                        "type": "stream_chunk",
                                        "content": content
                                    }))

                            elif chunk.get("type") == "error":
                                await websocket.send_text(json.dumps(chunk))
                                break

                    except Exception as e:
                        await websocket.send_text(json.dumps({
                            "type": "error",
                            "content": f"LLM流式响应异常: {str(e)}"
                        }))

                    # 保存 AI 消息
                    ai_message = {
                        "id": str(uuid.uuid4()),
                        "role": "assistant",
                        "content": full_response,
                        "timestamp": _now(),
                    }
                    conversation_manager.add_message(conversation_id, ai_message)

                    # 通知前端流结束
                    await websocket.send_text(json.dumps({
                        "type": "stream_end",
                        "content": full_response,
                        "conversation_id": conversation_id
                    }))

            elif heartbeat_task in done:
                # 定时心跳
                await websocket.send_text(json.dumps({"type": "ping"}))

            # 取消没用的任务，防止内存泄露
            for task in pending:
                task.cancel()

    except WebSocketDisconnect:
        print("客户端断开 WebSocket")
    except Exception as e:
        print("WebSocket 错误:", e)
        try:
            await websocket.send_text(json.dumps({
                "type": "error",
                "content": f"WebSocket 连接错误: {str(e)}"
            }))
        except Exception:
            pass
    finally:
        # ⚠️ 确保关闭
        try:
            await websocket.close()
        except Exception:
            pass

@router.post("/conversations", response_model=ConversationResponse)
async def create_conversation(request: ConversationCreateRequest):
    """创建新对话"""
    conversation_id = conversation_manager.create_conversation(request.title)
    conversation = conversation_manager.get_conversation(conversation_id)
    return ConversationResponse(
        id=conversation["id"],
        title=conversation["title"],
        created_at=conversation["created_at"],
        updated_at=conversation["updated_at"],
        message_count=len(conversation["messages"])
    )

@router.get("/conversations", response_model=ConversationListResponse)
async def list_conversations():
    """获取对话列表"""
    conversations = conversation_manager.get_all_conversations()
    conversation_list = [
        ConversationResponse(
            id=conv["id"],
            title=conv["title"],
            created_at=conv["created_at"],
            updated_at=conv["updated_at"],
            message_count=len(conv["messages"])
        )
        for conv in conversations
    ]
    conversation_list.sort(key=lambda x: x.updated_at, reverse=True)
    return ConversationListResponse(conversations=conversation_list)

@router.get("/conversations/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(conversation_id: str):
    """获取对话详情"""
    conversation = conversation_manager.get_conversation(conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="对话不存在")
    return ConversationResponse(
        id=conversation["id"],
        title=conversation["title"],
        created_at=conversation["created_at"],
        updated_at=conversation["updated_at"],
        message_count=len(conversation["messages"])
    )

@router.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str):
    """删除对话"""
    success = conversation_manager.delete_conversation(conversation_id)
    if not success:
        raise HTTPException(status_code=404, detail="对话不存在")
    return {"message": "对话已删除"}

@router.post("/conversations/{conversation_id}/clear")
async def clear_conversation(conversation_id: str):
    """清空对话消息"""
    conversation = conversation_manager.get_conversation(conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="对话不存在")
    conversation["messages"] = []
    conversation["updated_at"] = _now()
    return {"message": "对话已清空"}