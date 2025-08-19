from typing import List, Dict

def format_news_list(news_list: List[Dict]) -> str:
    """
    将新闻列表排版为适合公众号或网页展示的格式。
    每条新闻包含标题（带超链接）、摘要。
    """
    if not news_list:
        return "暂无相关新闻。"

    formatted = []
    for idx, news in enumerate(news_list, 1):
        title = news.get("title", "无标题")
        link = news.get("link", "#")
        snippet = news.get("snippet", "")
        item = f"{idx}. <a href='{link}' target='_blank'>{title}</a><br>{snippet}<br><br>"
        formatted.append(item)
    return "".join(formatted)