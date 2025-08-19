from fastapi import APIRouter
from pydantic import BaseModel
from app.agents.article_agent import generate_article
from app.agents.news_agent import get_ai_news_and_summary
from app.agents.layout_agent import format_news_list  # 新增导入
from app.agents.report_agent import generate_report

router = APIRouter()


# 请求模型
class GenerateRequest(BaseModel):
    topic: str

@router.post("/generate")
def generate_content(req: GenerateRequest):
    content = generate_article(req.topic)
   # image_url = generate_image(topic)
    return {
        "article": content,
        "image_url": "",#image_url
    }

@router.post("/get_ai_news")
def get_ai_news(req: GenerateRequest):
    content = get_ai_news_and_summary()
    formatted_news = format_news_list(content["news_list"])  # 调用排版
    return {
        "article": content,
        "news_list": content["news_list"],
        "summary": content["summary"],
        "formatted_news": formatted_news,
        "image_url": "",  # image_url
    }

@router.post("/generate_report")
def get_report(req: GenerateRequest):
    report = generate_report(req.topic)
    return {
        "topic": req.topic,
        "report": report
        # "pdf_path": pdf_path  # 如有需要可加上
    }