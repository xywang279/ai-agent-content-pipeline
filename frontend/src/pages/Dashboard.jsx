import React, { useState } from "react";
import { Input, Button, Typography, Alert, Spin, Card, Space } from "antd";
import { generateContent, getNews,getReport } from "../api/content";

const { Title, Paragraph } = Typography;

export default function Dashboard() {
  const [topic, setTopic] = useState("");
  const [article, setArticle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError("请输入主题");
      return;
    }
    setError("");
    setLoading(true);
    setArticle("");
    setImageUrl("");
    try {
      const data = await generateContent(topic);
      setArticle(data.article);
      setImageUrl(data.image_url);
    } catch (err) {
      setError("生成内容失败，请重试。");
    } finally {
      setLoading(false);
    }
  };

  const handleGetNews = async () => {
    if (!topic.trim()) {
      setError("请输入主题");
      return;
    }
    setError("");
    setLoading(true);
    setArticle("");
    setImageUrl("");
    try {
      const data = await getNews(topic);
      setArticle(data.article);
      setImageUrl(data.image_url);
    } catch (err) {
      setError("获取新闻失败，请重试。");
    } finally {
      setLoading(false);
    }
  };

  const handleGetREPORT = async () => {
    if (!topic.trim()) {
      setError("请输入主题");
      return;
    }
    setError("");
    setLoading(true);
    setArticle("");
    setImageUrl("");
    try {
      const data = await getReport(topic);
     // setArticle(data.article);
     // setImageUrl(data.image_url);
    } catch (err) {
      console.log(err);
      setError("获取新闻失败，请重试。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card style={{ maxWidth: 700, margin: "32px auto", padding: 24 }}>
      <Title level={2}>AI 内容创作流水线</Title>
      <Space direction="vertical" style={{ width: "100%" }} size="large">
        <Input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="输入主题"
          size="large"
          disabled={loading}
        />
        <Space>
          <Button
            type="primary"
            onClick={handleGenerate}
            loading={loading}
            disabled={loading}
          >
            生成内容
          </Button>
          <Button
            onClick={handleGetNews}
            loading={loading}
            disabled={loading}
          >
            获取AI新闻
          </Button>
          <Button
            onClick={handleGetREPORT}
            loading={loading}
            disabled={loading}
          >
            SHEN 
          </Button>
        </Space>
        {error && <Alert type="error" message={error} showIcon />}
        {loading && (
          <div style={{ textAlign: "center", margin: "24px 0" }}>
            <Spin tip="生成中..." />
          </div>
        )}
        {article && (
          <Card title="文章" type="inner">
            <Paragraph style={{ whiteSpace: "pre-wrap" }}>{article}</Paragraph>
          </Card>
        )}
        {imageUrl && (
          <Card title="配图" type="inner" style={{ textAlign: "center" }}>
            <img
              src={imageUrl}
              alt="AI生成"
              style={{ width: "100%", maxWidth: 400, borderRadius: 8 }}
            />
          </Card>
        )}
      </Space>
    </Card>
  );
}
