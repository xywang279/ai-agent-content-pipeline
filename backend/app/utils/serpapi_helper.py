from langchain_community.document_loaders import WebBaseLoader
from serpapi import GoogleSearch
import os

SERPAPI_API_KEY = os.getenv("SERPAPI_API_KEY")

def search_ai_news(topic: str = "人工智能AI") -> list:
    """
    使用 SerpAPI 搜索指定主题的新闻。
    :param topic: 搜索主题，默认为“人工智能AI”
    :return: 新闻列表
    """
    params = {
        "engine": "google",
        "q": f"{topic} 新闻 site:36kr.com OR site:techcrunch.com OR site:news.qq.com",
        "api_key":SERPAPI_API_KEY,
        "tbs": "qdr:w",  # 最近一周
        "num": 5,
        "hl": "zh-CN",
        "gl": "cn"
    }

    search = GoogleSearch(params)
    results = search.get_dict()
    return results

def search_resource(topic: str, num_results: int = 5) -> list:
    """
    使用 SerpAPI 搜索任意主题的网页，并返回网页内容文档列表。
    :param query: 搜索关键词
    :param num_results: 返回网页数量
    :return: 网页内容文档列表
    """
    params = {
        "engine": "google",
        "q": topic,
        "api_key": SERPAPI_API_KEY,
        "tbs": "qdr:w",
        "num": num_results,
        "hl": "zh-CN",
        "gl": "cn"
    }
    search = GoogleSearch(params)
    results = search.get_dict()
    return results

def get_links_doc(results):
   
    if not results or "organic_results" not in results:
        return []

    # 提取前几个搜索链接
    links = [item["link"] for item in results.get("organic_results", [])[:3]]
    print("抓到的链接：", links)

    # 加载网页内容
    loader = WebBaseLoader(links)
    docs = loader.load()

    # for doc in docs:
    #     print("URL:", doc.metadata["source"])
    #     print("正文片段:", doc.page_content[:200], "...")
    return docs

    news_list = []
    for r in results.get("organic_results", []):
        news_list.append({
            "title": r.get("title"),
            "link": r.get("link"),
            "snippet": r.get("snippet", "")
        })
    return news_list