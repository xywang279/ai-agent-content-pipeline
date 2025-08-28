from langchain_community.chat_models import ChatOpenAI
from app.config import DEEPSEEK_API_KEY
from app.config import BASE_URL
from app.utils.llm_helper import llm_helper
async def generate_article(topic: str) -> str:
    prompt = f"请为主题 '{topic}' 写一篇 800 字的原创中文文章，适合公众号发布。"
    messages = [
        {"role": "system", "content": "你是一个专业的中文写作助手。"},
        {"role": "user", "content": prompt}
    ]
    response = await llm_helper.chat_completion(
        messages=messages,
        temperature=0.7,
        max_tokens=1200
    )
    return response["choices"][0]["message"]["content"]
