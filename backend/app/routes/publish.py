from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import requests
import os
from app.agents.news_agent import get_ai_news_and_summary
from app.agents.layout_agent import format_news_list

router = APIRouter()

WECHAT_APPID = os.getenv("WECHAT_APPID")
WECHAT_APPSECRET = os.getenv("WECHAT_APPSECRET")

class PublishRequest(BaseModel):
    title: str
    content: str  # HTML内容
    author: str = ""
    digest: str = ""

def get_wechat_access_token():
    url = f"https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid={WECHAT_APPID}&secret={WECHAT_APPSECRET}"
    resp = requests.get(url)
    data = resp.json()
    print("微信返回：", data)  # 添加这一行
    if "access_token" not in data:
        raise HTTPException(status_code=500, detail="获取微信 access_token 失败")
    return data["access_token"]

@router.post("/publish_wechat_draft")
def publish_wechat_draft(req: PublishRequest):
    filepath = save_content_to_html( req.title,  req.content)
    print(f"已保存到: {filepath}")
    return True
    access_token = get_wechat_access_token()
    # 上传图文消息到草稿箱
    url = f"https://api.weixin.qq.com/cgi-bin/draft/add?access_token={access_token}"
    payload = {
        "articles": [
            {
                "title": req.title,
                "author": req.author,
                "digest": req.digest,
                "content": req.content,
                "content_source_url": "",
                "need_open_comment": 0,
                "only_fans_can_comment": 0
            }
        ]
    }
    resp = requests.post(url, json=payload)
    data = resp.json()
    print("微信草稿箱返回：", data)
    if data.get("errcode", 0) != 0:
        raise HTTPException(status_code=500, detail=f"微信草稿箱发布失败: {data.get('errmsg')}")
    return {"media_id": data.get("media_id"), "msg": "发布到草稿箱成功"}

def save_content_to_html(title: str, content: str, output_dir: str = "wechat_drafts"):
    """
    将要上传到草稿箱的内容保存为本地 HTML 文件。
    :param title: 文章标题
    :param content: 文章 HTML 内容
    :param output_dir: 保存目录
    :return: 文件路径
    """
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    # 用标题生成文件名，去除特殊字符
    safe_title = "".join(c for c in title if c.isalnum() or c in (' ', '_', '-')).rstrip()
    filename = f"{safe_title or 'draft'}.html"
    filepath = os.path.join(output_dir, filename)
    html = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>{title}</title>
</head>
<body>
{content}
</body>
</html>
"""
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(html)
    return filepath
@router.post("/publish_ai_news_to_wechat")
def publish_ai_news_to_wechat():
    """
    获取AI新闻，排版后发布到微信公众号草稿箱
    """
    content = get_ai_news_and_summary()
    formatted_news = format_news_list(content["news_list"])
    title = "最新AI相关新闻"
    digest = content["summary"][:120] if content["summary"] else ""
    req = PublishRequest(title=title, content=formatted_news, digest=digest)
    return publish_wechat_draft(req)