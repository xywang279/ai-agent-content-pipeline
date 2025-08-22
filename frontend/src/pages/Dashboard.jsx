import React, { useState } from "react";
import { Input, Button, Typography, Alert, Spin, Card, Space, message } from "antd";
import ReactMarkdown from "react-markdown";
import { generateContent, getNews, getReport } from "../api/content";

const { Title } = Typography;

export default function Dashboard() {
  const [topic, setTopic] = useState("");
  const [article, setArticle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [pdfPath, setPdfPath] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState([]);

  // 通用请求处理器
  const handleRequest = async (apiFunc, successHandler, failMsg) => {
    if (!topic.trim()) {
      setError("请输入主题");
      return;
    }
    setError("");
    setLoading(true);
    setArticle("");
    setImageUrl("");
    setPdfPath("");
    try {
      const data = await apiFunc(topic);
      successHandler(data);
    } catch (err) {
      setError(failMsg);
    } finally {
      setLoading(false);
    }
  };

  // 聊天功能（本地模拟，实际可对接后端chat接口）
  const handleChat = () => {
    if (!chatInput.trim()) return;
    setChatHistory([...chatHistory, { role: "user", content: chatInput }]);
    // 这里可调用后端chat接口
    setChatHistory((history) => [
      ...history,
      { role: "ai", content: `AI回复：${chatInput}` },
    ]);
    setChatInput("");
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
          onPressEnter={() =>
            handleRequest(
              generateContent,
              (data) => {
                setArticle(data.article);
                setImageUrl(data.image_url);
                setPdfPath(data.pdf_path || "");
              },
              "生成内容失败，请重试。"
            )
          }
        />
        <Space>
          <Button
            type="primary"
            onClick={() =>
              handleRequest(
                generateContent,
                (data) => {
                  setArticle(data.article);
                  setImageUrl(data.image_url);
                  setPdfPath(data.pdf_path || "");
                },
                "生成内容失败，请重试。"
              )
            }
            loading={loading}
            disabled={loading}
          >
            生成内容
          </Button>
          <Button
            onClick={() =>
              handleRequest(
                getNews,
                (data) => {
                  setArticle(data.article);
                  setImageUrl(data.image_url);
                  setPdfPath(data.pdf_path || "");
                },
                "获取新闻失败，请重试。"
              )
            }
            loading={loading}
            disabled={loading}
          >
            获取AI新闻
          </Button>
          <Button
            onClick={() =>
              handleRequest(
                getReport,
                (data) => {
                  setArticle(data.report || data.article || "报告生成成功");
                  setImageUrl(data.image_url || "");
                  setPdfPath(data.pdf_path || "");
                  if (data.pdf_path) {
                    message.success(
                      <span>
                        报告已生成，
                        <a
                          href={data.pdf_path}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          点击下载PDF
                        </a>
                      </span>
                    );
                  }
                },
                "生成报告失败，请重试。"
              )
            }
            loading={loading}
            disabled={loading}
          >
            生成报告
          </Button>
        </Space>
        {error && <Alert type="error" message={error} showIcon />}
        {loading && (
          <div style={{ textAlign: "center", margin: "24px 0" }}>
            <Spin tip="生成中..." />
          </div>
        )}
        {article && (
          <Card title="内容 (Markdown 渲染)" type="inner">
            <ReactMarkdown>{article}</ReactMarkdown>
            {pdfPath && (
              <div style={{ marginTop: 16 }}>
                <a href={pdfPath} target="_blank" rel="noopener noreferrer">
                  下载完整PDF文件
                </a>
              </div>
            )}
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
        {/* 聊天功能 */}
        <Card title="继续聊天" type="inner">
          <div style={{ maxHeight: 200, overflowY: "auto", marginBottom: 8 }}>
            {chatHistory.map((msg, idx) => (
              <div key={idx} style={{ textAlign: msg.role === "user" ? "right" : "left" }}>
                <b>{msg.role === "user" ? "你" : "AI"}：</b>
                <span>{msg.content}</span>
              </div>
            ))}
          </div>
          <Input.Search
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onSearch={handleChat}
            enterButton="发送"
            placeholder="继续提问或对话"
            disabled={loading}
          />
        </Card>
      </Space>
    </Card>
  );
}
