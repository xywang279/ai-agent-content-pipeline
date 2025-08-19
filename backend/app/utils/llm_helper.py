#from langchain_community.chat_models import ChatOpenAI
from langchain_openai import ChatOpenAI
from app.config import DEEPSEEK_API_KEY, BASE_URL

def get_llm():
    llm = ChatOpenAI(
        model_name="deepseek-chat",
        temperature=0.7,
        openai_api_key=DEEPSEEK_API_KEY,
        base_url=BASE_URL,
    )
    return llm