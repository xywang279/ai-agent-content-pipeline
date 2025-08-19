from langchain_community.utilities import SerpAPIWrapper
from langchain.chains import LLMChain
from langchain.prompts import PromptTemplate
from app.utils.llm_helper import get_llm
from serpapi import GoogleSearch
import os

SERPAPI_API_KEY = os.getenv("SERPAPI_API_KEY")

def search_ai_news():
    params = {
        "engine": "google",
        "q": "人工智能AI 新闻 site:36kr.com OR site:techcrunch.com OR site:news.qq.com",
        "api_key": os.getenv("SERPAPI_API_KEY"),
        "tbs": "qdr:w",  # 最近一周
        "num": 5,
        "hl": "zh-CN",
        "gl": "cn"
    }

    search = GoogleSearch(params)
    results = search.get_dict()

    news_list = []
    for r in results.get("organic_results", []):
        news_list.append({
            "title": r.get("title"),
            "link": r.get("link"),
            "snippet": r.get("snippet", "")
        })
    return news_list

def summarize_news(news_text):
    prompt = PromptTemplate(
        input_variables=["news"],
        template="""你是一个资深新闻编辑，请用简洁的方式总结以下新闻的主要内容，每条控制在一句话之内。
新闻内容：
{news}
总结：
"""
    )
    llm = get_llm()
    chain = prompt | llm
    result = chain.invoke({"news": news_text})

    # invoke 返回的是 AIMessage 或 dict，要根据 llm 配置决定
    return result.content if hasattr(result, "content") else result

def get_ai_news_and_summary():
    news_list = search_ai_news()
    # 将所有新闻内容合并用于摘要
    news_text = "\n".join([f"{item['title']}：{item['snippet']}" for item in news_list])
    summary = summarize_news(news_text)
    return {
        "news_list": news_list,
        "summary": summary
    }
