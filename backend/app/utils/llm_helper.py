from langchain_openai import ChatOpenAI
from langchain.schema import HumanMessage, AIMessage, SystemMessage
from typing import List, Dict, AsyncGenerator
import asyncio
from app.config import DEEPSEEK_API_KEY, BASE_URL

class LLMHelper:
    def __init__(self):
        self.llm = ChatOpenAI(
            model_name="deepseek-chat",
            temperature=0.7,
            openai_api_key=DEEPSEEK_API_KEY,
            base_url=BASE_URL,
        )
    
    async def chat_completion(self, messages: List[Dict], temperature: float = 0.7) -> Dict:
        """调用 DeepSeek Chat Completion API"""
        try:
            # 转换消息格式
            langchain_messages = []
            for msg in messages:
                if msg["role"] == "user":
                    langchain_messages.append(HumanMessage(content=msg["content"]))
                elif msg["role"] == "assistant":
                    langchain_messages.append(AIMessage(content=msg["content"]))
                elif msg["role"] == "system":
                    langchain_messages.append(SystemMessage(content=msg["content"]))
            
            # 调用 LLM
            response = await self.llm.ainvoke(langchain_messages)
            
            return {
                "choices": [{
                    "message": {
                        "content": response.content,
                        "role": "assistant"
                    }
                }]
            }
        except Exception as e:
            raise Exception(f"DeepSeek API 调用失败: {str(e)}")
    
    async def chat_completion_stream(self, messages: List[Dict], temperature: float = 0.7) -> AsyncGenerator[Dict, None]:
        """流式调用 DeepSeek Chat Completion API"""
        try:
            # 转换消息格式
            langchain_messages = []
            for msg in messages:
                if msg["role"] == "user":
                    langchain_messages.append(HumanMessage(content=msg["content"]))
                elif msg["role"] == "assistant":
                    langchain_messages.append(AIMessage(content=msg["content"]))
                elif msg["role"] == "system":
                    langchain_messages.append(SystemMessage(content=msg["content"]))
            
            # 流式调用 LLM
            async for chunk in self.llm.astream(langchain_messages):
                if chunk.content:
                    yield {
                        "type": "stream_chunk",
                        "content": chunk.content
                    }
                    
        except Exception as e:
            yield {
                "type": "error",
                "content": f"DeepSeek API 流式调用失败: {str(e)}"
            }

# 全局 LLM Helper 实例
llm_helper = LLMHelper()