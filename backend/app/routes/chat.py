from fastapi import APIRouter, WebSocket, HTTPException, WebSocketDisconnect,File, UploadFile, Form
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import json
import uuid
from datetime import datetime
import asyncio
import os
from app.utils.llm_helper import llm_helper
from app.utils.conversation_manager_usesql import conversation_manager
from app.utils.memory_manager import MemoryManager
from app.agents.report_agent import  report_agent
from app.services.file_service import file_service
from app.services.index_service import index_service
from app.services import chunking_service
from app.services.db_service import DatabaseService
from app.database import SessionLocal
from sqlalchemy import text as sql_text
from app.services.index_service import index_service
from app.services import extraction_service, chunking_service
from app.config import CONV_TOPK, KB_TOPK

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

class ConversationItem(BaseModel):
    id: str
    title: str
    preview: str
    time: str
    message_count: int

class ConversationListResponse(BaseModel):
    conversations: List[ConversationItem]

class ReportGenerateRequest(BaseModel):
    conversation_id: str
    template_type: Optional[str] = "standard"
    custom_instructions: Optional[str] = None

class ReportOptimizeRequest(BaseModel):
    conversation_id: str
    current_report: str
    optimization_request: str

class ReportResponse(BaseModel):
    report_id: str
    content: str
    conversation_id: str
    timestamp: str
class FileUploadResponse(BaseModel):
    file_id: str
    file_name: str
    file_info: Dict
    analysis_data: Dict
    insights: str
    conversation_id: str

class FileItem(BaseModel):
    id: str
    conversation_id: str
    file_name: str
    file_path: str
    file_size: int
    file_format: str
    file_info: Optional[Dict] = None
    insights: Optional[str] = None
    created_at: str
    updated_at: str

class FileListResponse(BaseModel):
    files: List[FileItem]
@router.post("/upload", response_model=FileUploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    conversation_id: str = Form(...)
):
    """上传并分析文件"""
    try:
        # 验证文件格式
        file_extension = os.path.splitext(file.filename)[1].lower()
        if file_extension not in file_service.supported_formats:
            raise HTTPException(
                status_code=400, 
                detail=f"不支持的文件格式。支持的格式: {', '.join(file_service.supported_formats)}"
            )
        
        # 处理文件上传和分析
        result = await file_service.process_upload_and_analyze(file, conversation_id)
        
        if not result["success"]:
            raise HTTPException(status_code=500, detail=result["error"])
        
        # 由于当前的 file_service 没有保存到数据库并返回 ID，
        # 我们需要手动保存文件记录到数据库
         # 手动保存文件记录到数据库
        try:
            db_service = DatabaseService(SessionLocal())
            file_record = db_service.create_file_record(
                conversation_id=conversation_id,
                file_name=file.filename,
                file_path=result["file_path"],
                file_size=result["file_info"]["file_size"],
                file_format=result["file_info"]["file_format"],
                file_info=result["file_info"],
                analysis_data=result["analysis_data"],
                insights=result["insights"]
            )
            # 构建向量索引（以文件ID为命名空间）
            try:
                full_text = (result.get("content_data") or {}).get("full_text") or ""
                if not full_text:
                    # 兼容：从结构化内容拼接
                    cd = result.get("content_data") or {}
                    parts = []
                    for p in cd.get("pages", []) or []:
                        parts.append(p.get("content", ""))
                    for p in cd.get("paragraphs", []) or []:
                        parts.append(p.get("content", ""))
                    for s in cd.get("slides", []) or []:
                        parts.append(s.get("content", ""))
                    full_text = "\n".join(parts)
                if full_text:
                    file_service.build_vector_store(file_record["id"], full_text)
                    # 同步入库到会话空间 conv_<conversation_id>
                    try:
                        docs = chunking_service.chunk_from_text(full_text, kb=f"conv_{conversation_id}", file_name=file.filename)
                        index_service.upsert_docs(f"conv_{conversation_id}", docs)
                    except Exception:
                        pass
            except Exception:
                pass
        except Exception as db_error:
            print(f"数据库保存错误: {str(db_error)}")
            # 如果数据库保存失败，使用临时ID
            file_record = {
                "id": str(uuid.uuid4()),
                "conversation_id": conversation_id,
                "file_name": file.filename,
                "file_path": result["file_path"],
                "file_size": result["file_info"]["file_size"],
                "file_format": result["file_info"]["file_format"]
            }
        
        # 添加文件分析消息到对话
        analysis_message = {
            "id": str(uuid.uuid4()),
            "role": "assistant",
            "content": f"📄 文件分析完成：\n\n{result['insights']}",
            "timestamp": datetime.now().isoformat(),
            "tool_call": {
                "name": "file_analyzer",
                "arguments": {
                    "file_name": file.filename,
                    "file_path": result["file_path"]
                },
                "status": "completed"
            }
        }
        conversation_manager.add_message(conversation_id, analysis_message)
        
        return FileUploadResponse(
            file_id=file_record["id"],
            file_name=file.filename,
            file_info=result["file_info"],
            analysis_data=result["analysis_data"],
            insights=result["insights"],
            conversation_id=conversation_id
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"文件上传失败: {str(e)}")
@router.get("/files/{conversation_id}", response_model=FileListResponse)
async def list_files(conversation_id: str):
    """获取对话中的文件列表"""
    try:
        db_service = DatabaseService(SessionLocal())
        files = db_service.get_files_by_conversation(conversation_id)
         # 转换为 FileItem 对象
        file_items = []
        for file in files:
            file_items.append(FileItem(
                id=file["id"],
                conversation_id=file["conversation_id"],
                file_name=file["file_name"],
                file_path=file["file_path"],
                file_size=file["file_size"],
                file_format=file["file_format"],
                file_info=file["file_info"],
                insights=file["insights"],
                created_at=file["created_at"],
                updated_at=file["updated_at"]
            ))
        
        return FileListResponse(files=file_items)
       
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取文件列表失败: {str(e)}")

@router.get("/files/{file_id}/preview")
async def preview_file(file_id: str):
    """预览文件"""
    try:
        preview_content = file_service.get_file_preview(file_id)
        return {"preview": preview_content, "file_id": file_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"预览文件失败: {str(e)}")
       
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
        # 如果没有对话ID，创建新对话
        conversation_id = request.conversation_id
        if not conversation_id:
            # 根据第一条消息生成对话标题
            title = request.message[:20] + "..." if len(request.message) > 20 else request.message
            conversation_id = conversation_manager.create_conversation(title)
        
        # 添加用户消息
        user_message = {
            "id": str(uuid.uuid4()),
            "role": "user",
            "content": request.message,
            "timestamp": datetime.now().isoformat()
        }
        conversation_manager.add_message(conversation_id, user_message)

        # 检查是否是报告生成请求
        if "生成报告" in request.message or "帮我写报告" in request.message:
            # 自动生成报告
            report_content = await generate_report_automatically(conversation_id)
            
            # 添加报告作为 AI 消息
            ai_message = {
                "id": str(uuid.uuid4()),
                "role": "assistant",
                "content": f"好的，我已经根据我们的对话生成了报告：\n\n{report_content}",
                "timestamp": datetime.now().isoformat(),
                "tool_call": {
                    "name": "report_generator",
                    "arguments": {"type": "auto_generated"},
                    "status": "completed"
                }
            }
            conversation_manager.add_message(conversation_id, ai_message)
            
            return ChatMessageResponse(
                message_id=ai_message["id"],
                content=ai_message["content"],
                conversation_id=conversation_id,
                role="assistant",
                timestamp=ai_message["timestamp"]
            )
        
        # 获取对话历史
        messages = conversation_manager.get_messages(conversation_id)
        formatted_messages = [{"role": msg["role"], "content": msg["content"]} for msg in messages]
        
        # 调用 DeepSeek API
        response = await llm_helper.chat_completion(
            messages=formatted_messages,
            temperature=0.7
        )
        
        # 提取 AI 回复
        ai_content = response["choices"][0]["message"]["content"]
        
        # 添加 AI 消息
        ai_message = {
            "id": str(uuid.uuid4()),
            "role": "assistant",
            "content": ai_content,
            "timestamp": datetime.now().isoformat()
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
                    kb_name = message_data.get("kb")

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

                    # 组合检索：会话空间 + 可选 KB 空间
                    try:
                        conv_docs = []
                        try:
                            conv_retriever = index_service.retriever(f"conv_{conversation_id}", k=CONV_TOPK)
                            conv_docs = conv_retriever.get_relevant_documents(message)
                        except Exception:
                            conv_docs = []
                        kb_docs = []
                        if kb_name:
                            try:
                                kb_retriever = index_service.retriever(kb_name, k=KB_TOPK)
                                kb_docs = kb_retriever.get_relevant_documents(message)
                            except Exception:
                                kb_docs = []
                        kn_segments = []
                        for d in conv_docs + kb_docs:
                            if d and getattr(d, 'page_content', None):
                                kn_segments.append(d.page_content)
                        if kn_segments:
                            knowledge_context = "\n".join(kn_segments[:5])
                            kc_prompt = f"【检索知识】\n{knowledge_context}"
                            formatted_messages = [{"role": "system", "content": kc_prompt}] + formatted_messages
                    except Exception:
                        pass
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

@router.post("/conversations", response_model=dict)
async def create_conversation(request: ConversationCreateRequest):
    """创建新对话"""
    conversation_id = conversation_manager.create_conversation(request.title)
    conversation = conversation_manager.get_conversation(conversation_id)
    
    return {
        "id": conversation["id"],
        "title": conversation["title"],
        "created_at": conversation["created_at"]
    }

@router.get("/conversations", response_model=ConversationListResponse)
async def list_conversations():
    """获取对话列表"""
    conversations = conversation_manager.get_all_conversations()
    
    # 按更新时间排序（最新的在前面）
    conversations.sort(key=lambda x: x["updated_at"], reverse=True)
    
    conversation_items = []
    for conv in conversations:
        # 生成预览
        preview = conversation_manager.get_conversation_preview(conv["id"])
        
        # 格式化时间
        updated_time = datetime.fromisoformat(conv["updated_at"].replace('Z', '+00:00'))
        time_str = updated_time.strftime("%m-%d %H:%M")
        
        conversation_items.append(ConversationItem(
            id=conv["id"],
            title=conv["title"],
            preview=preview,
            time=time_str,
            message_count= len(conv.get("messages", []))
        ))
    
    return ConversationListResponse(conversations=conversation_items)

@router.get("/conversations/{conversation_id}")
async def get_conversation(conversation_id: str):
    """获取对话详情"""
    conversation = conversation_manager.get_conversation(conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="对话不存在")
    
    return conversation

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
    conversation["updated_at"] = datetime.now().isoformat()
    return {"success": True}

@router.get("/conversations/{conversation_id}/retrieval/status")
async def conv_retrieval_status(conversation_id: str):
    """获取会话检索空间状态（chunk 数）"""
    try:
        chunks = index_service.total_chunks(f"conv_{conversation_id}")
        return {"conversation_id": conversation_id, "doc_chunks": chunks}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取会话检索状态失败: {str(e)}")

@router.post("/conversations/{conversation_id}/retrieval/rebuild")
async def conv_retrieval_rebuild(conversation_id: str):
    """重建会话检索空间（根据 file_records 重新抽取并入库）"""
    try:
        # 清空向量库目录
        index_service.rebuild(f"conv_{conversation_id}")
        # 读取 file_records
        db = SessionLocal()
        rows = db.execute(sql_text(
            "SELECT id, file_name, file_path FROM file_records WHERE conversation_id = :cid AND is_active = 1"
        ), {"cid": conversation_id}).fetchall()
        total_files = 0
        total_chunks = 0
        for r in rows:
            file_name = r[1]
            file_path = r[2]
            try:
                extracted = extraction_service.extract(file_path)
                text = chunking_service.text_from_extracted(extracted)
                docs = chunking_service.chunk_from_text(text, f"conv_{conversation_id}", file_name)
                index_service.upsert_docs(f"conv_{conversation_id}", docs)
                total_files += 1
                total_chunks += len(docs)
            except Exception:
                continue
        return {"success": True, "conversation_id": conversation_id, "files": total_files, "chunks": total_chunks}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"重建失败: {str(e)}")

@router.post("/reports/generate", response_model=ReportResponse)
async def generate_report(request: ReportGenerateRequest):
    """生成报告"""
    try:
        # 从对话中提取信息
        report_info = conversation_manager.extract_report_info(request.conversation_id)
        
        # 生成报告
        report_content = await report_agent.generate_report(
            report_info, 
            request.template_type or "standard"
        )
        
        # 添加报告生成消息到对话
        report_message = {
            "id": str(uuid.uuid4()),
            "role": "assistant",
            "content": f"报告已生成：\n\n{report_content}",
            "timestamp": datetime.now().isoformat(),
            "tool_call": {
                "name": "report_generator",
                "arguments": {
                    "type": "manual",
                    "template": request.template_type
                },
                "status": "completed"
            }
        }
        conversation_manager.add_message(request.conversation_id, report_message)
        
        return ReportResponse(
            report_id=str(uuid.uuid4()),
            content=report_content,
            conversation_id=request.conversation_id,
            timestamp=datetime.now().isoformat()
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"报告生成失败: {str(e)}")

@router.post("/reports/optimize", response_model=ReportResponse)
async def optimize_report(request: ReportOptimizeRequest):
    """优化报告"""
    try:
        # 优化报告
        optimized_report = await  report_agent.optimize_report(
            request.current_report,
            request.optimization_request
        )
        
        # 添加优化后的报告到对话
        report_message = {
            "id": str(uuid.uuid4()),
            "role": "assistant",
            "content": f"报告已优化：\n\n{optimized_report}",
            "timestamp": datetime.now().isoformat(),
            "tool_call": {
                "name": "report_optimizer",
                "arguments": {
                    "request": request.optimization_request
                },
                "status": "completed"
            }
        }
        conversation_manager.add_message(request.conversation_id, report_message)
        
        return ReportResponse(
            report_id=str(uuid.uuid4()),
            content=optimized_report,
            conversation_id=request.conversation_id,
            timestamp=datetime.now().isoformat()
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"报告优化失败: {str(e)}")
async def generate_report_automatically(conversation_id: str) -> str:
    """自动生成报告"""
    try:
        # 从对话中提取信息
        report_info = conversation_manager.extract_report_info(conversation_id)
        
        # 生成报告
        report_content = await  report_agent.generate_report(report_info, "standard")
        return report_content
    except Exception as e:
        return f"自动生成报告失败: {str(e)}"
