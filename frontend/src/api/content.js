const BASE_URL = "http://127.0.0.1:8000/api";

async function request(endpoint, data) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || "请求失败");
  }
  return res.json();
}

export function generateContent(topic) {
  return request("/content/generate", { topic });
}

export function getNews(topic) {
  return request("/publish/publish_ai_news_to_wechat", { topic });
}

export function getReport(topic) {
  return request("/content/generate_report", { topic });
}