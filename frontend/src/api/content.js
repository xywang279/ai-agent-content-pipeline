export async function generateContent(topic) {
  const res = await fetch("http://127.0.0.1:8000/api/content/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic }),
  });
  return res.json();
}

export async function getNews(topic) {
  const res = await fetch("http://127.0.0.1:8000/api/publish/publish_ai_news_to_wechat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic }),
  });
  return res.json();
}

export async function getReport(topic) {
  const res = await fetch("http://127.0.0.1:8000/api/content/generate_report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic }),
  });
  return res.json();
}