import requests
from app.config import DEEPSEEK_API_KEY

def generate_image(prompt: str) -> str:
    # 这里用 DeepSeek 的图像 API（假设有）
    resp = requests.post(
        "https://api.deepseek.com/v1/images",
        headers={"Authorization": f"Bearer {DEEPSEEK_API_KEY}"},
        json={"prompt": prompt, "size": "1024x1024"}
    )
    data = resp.json()
    return data["data"][0]["url"]
