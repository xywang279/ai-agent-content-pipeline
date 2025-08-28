# app/agents/memory_agent.py
from typing import Dict
from langchain.memory import ConversationBufferMemory
from langchain.chains import ConversationChain
from app.utils.llm_helper import llm_helper
from app.utils.memory_manager import MemoryManager

memory_manager = MemoryManager()
# 简单的进程内会话存储：生产建议换 Redis/DB
_SESSIONS: Dict[str, list] = {}  # 用列表存储短期对话历史

def _get_memory(conversation_id: str) -> list:
    if conversation_id not in _SESSIONS:
        _SESSIONS[conversation_id] = []
    return _SESSIONS[conversation_id]

def save_long_term_memory(text: str):
    memory_manager.add_texts([text])

def recall_long_term_memory(query: str, k=3):
    return memory_manager.search(query, k=k)

async def chat_with_memory(message: str, conversation_id: str = "default", k: int = 5) -> str:
    # 短期记忆：取最近N条
    short_term = _get_memory(conversation_id)[-k:]
    short_term_context = "\n".join(short_term)

    # 长期记忆：向量库检索
    long_term_results = memory_manager.search(message, k=k)
    long_term_context = "\n".join([doc.page_content for doc in long_term_results])

    # 拼接上下文
    system_prompt = "你是一个专业研究助手。优先使用提供的检索材料，若材料不足再基于常识回答。回答清晰、分点、引用事实。"
    context = ""
    if long_term_context:
        context += f"【长期记忆相关内容】\n{long_term_context}\n"
    if short_term_context:
        context += f"【短期对话历史】\n{short_term_context}\n"

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"{context}用户提问：{message}"}
    ]

    response = await llm_helper.chat_completion(
        messages=messages,
        temperature=0.7,
        max_tokens=1200
    )
    answer = response["choices"][0]["message"]["content"]

    # 保存到短期和长期记忆
    _get_memory(conversation_id).append(f"用户：{message}\n助手：{answer}")
    memory_manager.add_texts([answer])

    return answer
