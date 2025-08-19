from langchain_community.chat_models import ChatOpenAI
from app.config import DEEPSEEK_API_KEY
from app.config import BASE_URL
from app.utils.llm_helper import get_llm
def generate_article(topic: str) -> str:
    llm = get_llm()
    prompt = f"请为主题 '{topic}' 写一篇 800 字的原创中文文章，适合公众号发布。"
    result = llm.invoke(prompt)
    return result.content
