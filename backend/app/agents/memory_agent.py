# app/agents/memory_agent.py
from langchain.memory import ConversationBufferMemory
from langchain.chains import ConversationChain
from app.utils.llm_helper import get_llm
from app.utils.memory_manager import MemoryManager

memory_manager = MemoryManager()

def save_long_term_memory(text: str):
    memory_manager.add_texts([text])

def recall_long_term_memory(query: str, k=3):
    return memory_manager.search(query, k=k)

llm = get_llm()

# 短期记忆（对话缓冲）
memory = ConversationBufferMemory(return_messages=True)

conversation = ConversationChain(
    llm=llm,
    memory=memory,
    verbose=True
)

def chat_with_memory(user_input: str):
    return conversation.predict(input=user_input)
