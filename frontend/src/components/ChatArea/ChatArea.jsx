import React, { useState, useEffect, useRef } from 'react';
import { Button, Space, message, Select } from 'antd';
import ragApi from '../../api/rag';
import { 
  FolderOpenOutlined, 
  BarChartOutlined, 
  ClearOutlined 
} from '@ant-design/icons';
import api from '../../api/chat';
import websocket from '../../api/websocket';
import FileManager from '../FileManager/FileManager';
import './ChatArea.scss';
import "../../api/SimHei-normal.js"; // 引入中文字体文件
import { jsPDF } from "jspdf";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { saveAs } from "file-saver";
import InputArea from '../InputArea/InputArea.jsx';

const ChatArea = ({conversationId, onConversationUpdate  }) => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamContent, setStreamContent] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportContent, setReportContent] = useState('');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
   const [showFileManager, setShowFileManager] = useState(false);
  const [kbList, setKbList] = useState([]);
  const [currentKB, setCurrentKB] = useState('');
  const [convStatus, setConvStatus] = useState(null);
  const messagesEndRef = useRef(null);

  // 滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamContent]);

  // 加载KB列表
  useEffect(() => {
    (async () => {
      try {
        const r = await ragApi.listKBs();
        setKbList(r.kbs || []);
        if (!currentKB && r.kbs && r.kbs.length) setCurrentKB(r.kbs[0].name);
      } catch (e) {
        setKbList([]);
      }
    })();
  }, []);

  // 加载对话消息
  const loadConversationMessages = async (convId) => {
    if (!convId) {
      setMessages([]);
      return;
    }

    try {
      const conversation = await api.getConversationHistory(convId);
      setMessages(conversation.messages || []);
    } catch (error) {
      console.error('加载对话消息失败:', error);
      setMessages([]);
    }
  };

  // 当对话ID变化时加载消息
  useEffect(() => {
    loadConversationMessages(conversationId);
  }, [conversationId]);

  // 会话空间状态
  const loadConvStatus = async () => {
    if (!conversationId) { setConvStatus(null); return; }
    try {
      const res = await fetch(`http://localhost:8000/api/chat/conversations/${conversationId}/retrieval/status`);
      if (res.ok) {
        setConvStatus(await res.json());
      }
    } catch (e) {
      setConvStatus(null);
    }
  };
  useEffect(() => {
    loadConvStatus();
  }, [conversationId]);

  // 初始化 WebSocket 连接
  useEffect(() => {
    websocket.connect();
    const handleMessage = (data) => {
    console.log('收到 WebSocket 消息:', data);
      
      if (data.type === 'user_message') {
        if (data.role === 'assistant') {
          // 完整的 AI 回复
          addMessage({
            id: data.message_id || Date.now().toString(),
            type: 'ai',
            content: data.content,
            timestamp: new Date().toLocaleTimeString(),
            toolCall: data.tool_call
          });
          setIsLoading(false);
          setStreamContent('');
        } else if (data.role === 'user') {
          // 用户消息
          addMessage({
            id: data.message_id || Date.now().toString(),
            type: 'user_message',
            content: data.content,
            timestamp: new Date().toLocaleTimeString()
          });
        }
      } else if (data.type === 'stream_start') {
        // 流式响应开始
        setIsLoading(true);
        setStreamContent('');
      } else if (data.type === 'stream_chunk') {
        // 流式响应块
        setStreamContent(prev => prev + data.content);
      } else if (data.type === 'stream_end') {
        // 流式响应结束
        setIsLoading(false);
        setStreamContent(prev => {
            if (prev) {
              addMessage({
                id: Date.now().toString(),
                type: 'ai',
                content: prev,
                timestamp: new Date().toLocaleTimeString()
              });
            }
            return '';
          });
        onConversationUpdate && onConversationUpdate(conversationId);
      } else if (data.type === 'error') {
        // 错误消息
        setIsLoading(false);
        setStreamContent('');
        addMessage({
          id: Date.now().toString(),
          type: 'ai',
          content: `错误: ${data.message}`,
          timestamp: new Date().toLocaleTimeString(),
          isError: true
        });
      }
    };

    const handleConnected = () => {
      console.log('WebSocket 已连接');
      // 可以在这里发送初始化消息
    };

    const handleDisconnected = () => {
      console.log('WebSocket 已断开');
    };

    websocket.on('message', handleMessage);
    websocket.on('connected', handleConnected);
    websocket.on('disconnected', handleDisconnected);
    const handler = e => handleSendMessage(e.detail);
    window.addEventListener('sendMessage', handler);
    return () => {
      window.removeEventListener('sendMessage', handler);
      websocket.off('message', handleMessage);
      websocket.off('connected', handleConnected);
      websocket.off('disconnected', handleDisconnected);
    };
  }, [conversationId]);

  // 添加消息到聊天记录
  const addMessage = (message) => {
    setMessages(prev => [...prev, message]);
  };


   // 发送消息
  const handleSendMessage = async (content) => {
    if (!content.trim() || isLoading) return;

  // 添加用户消息
  const userMessage = {
    id: Date.now().toString(),
    type: 'user',
    content: content,
    timestamp: new Date().toLocaleTimeString()
  };
    
    addMessage(userMessage);

    try {
      // 检查是否是报告相关命令
      if (content.includes('生成报告') || content.includes('帮我写报告')) {
        await generateReport();
        return;
      }
      // 通过 WebSocket 发送消息
      if (websocket.isConnected) {
        const messageData = {
          type: 'user_message',
          content: content,
          conversation_id: conversationId,
          kb: currentKB || undefined
        };
        
        const sent = websocket.send(messageData);
        if (sent) {
          setIsLoading(true);
        } else {
          // 如果发送失败，使用 HTTP API
          await sendViaHttp(content);
        }
      } else {
        // 如果 WebSocket 不可用，使用 HTTP API
        await sendViaHttp(content);
      }
    } catch (error) {
      console.error('发送消息失败:', error);
      setIsLoading(false);
      
      // 显示错误消息
      addMessage({
        id: Date.now().toString(),
        type: 'ai',
        content: '抱歉，发送消息时出现错误。请稍后重试。',
        timestamp: new Date().toLocaleTimeString(),
        isError: true
      });
    }
  };

  // 通过 HTTP API 发送消息
  const sendViaHttp = async (content) => {
    setIsLoading(true);
    try {
      const response = await api.sendMessage(content, conversationId);
      
      // 添加 AI 回复
      const aiMessage = {
        id: Date.now().toString(),
        type: 'ai',
        content: response.content || response.message,
        timestamp: new Date().toLocaleTimeString(),
        toolCall: response.tool_call
      };
      
      addMessage(aiMessage);
      
      // 通知父组件对话已更新
      onConversationUpdate && onConversationUpdate(response.conversation_id);
    } finally {
      setIsLoading(false);
    }
  };
  // 生成报告
  const generateReport = async () => {
    if (!conversationId) return;
    
    setIsGeneratingReport(true);
    try {
      const response = await api.generateReport({
        conversation_id: conversationId,
        template_type: 'standard'
      });
      
      setReportContent(response.content);
      setShowReportModal(true);
      
      // 添加报告消息到对话
      addMessage({
        id: Date.now().toString(),
        type: 'ai',
        content: `报告已生成：\n\n${response.content}`,
        timestamp: new Date().toLocaleTimeString(),
        toolCall: {
          name: 'report_generator',
          status: 'completed'
        }
      });
      
    } catch (error) {
      console.error('生成报告失败:', error);
      addMessage({
        id: Date.now().toString(),
        type: 'ai',
        content: '生成报告时出现错误，请稍后重试。',
        timestamp: new Date().toLocaleTimeString(),
        isError: true
      });
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // 优化报告
  const optimizeReport = async (optimizationRequest) => {
    if (!reportContent || !conversationId) return;
    
    setIsGeneratingReport(true);
    try {
      const response = await api.optimizeReport({
        conversation_id: conversationId,
        current_report: reportContent,
        optimization_request: optimizationRequest
      });
      
      setReportContent(response.content);
      
      // 添加优化消息到对话
      addMessage({
        id: Date.now().toString(),
        type: 'ai',
        content: `报告已优化：\n\n${response.content}`,
        timestamp: new Date().toLocaleTimeString(),
        toolCall: {
          "name": "report_optimizer",
          "status": "completed"
        }
      });
      
    } catch (error) {
      console.error('优化报告失败:', error);
      addMessage({
        id: Date.now().toString(),
        type: 'ai',
        content: '优化报告时出现错误，请稍后重试。',
        timestamp: new Date().toLocaleTimeString(),
        isError: true
      });
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const exportReport = async(format) => {
  if (!reportContent) return;
  try {
      await api.exportReport(format, reportContent);
  }catch (error) {
      console.error('导出报告失败:', error);
    }
  
};
  // 清空对话
  const clearConversation = async () => {
    if (!conversationId) return;
    
    try {
      await api.clearConversation(conversationId);
      setMessages([]);
      setStreamContent('');
      // 通知父组件对话已更新
      onConversationUpdate && onConversationUpdate(conversationId);
    } catch (error) {
      console.error('清空对话失败:', error);
    }
  };

  // 保存对话
  const saveConversation = async () => {
    if (!conversationId || messages.length === 0) return;
    
    try {
      // 这里可以调用保存对话的 API
      console.log('保存对话:', { conversationId, messages });
    } catch (error) {
      console.error('保存对话失败:', error);
    }
  };
// 处理文件分析完成
  const handleFileAnalyzed = (analysisResult) => {
    // 添加文件分析消息到对话
    const analysisMessage = {
      id: Date.now().toString(),
      type: 'ai',
      content: `📄 文件分析完成：\n\n${analysisResult.insights}`,
      timestamp: new Date().toLocaleTimeString(),
      toolCall: {
        name: 'file_analyzer',
        status: 'completed'
      }
    };
    
    setMessages(prev => [...prev, analysisMessage]);
  };
  // 处理文件上传
  const handleFileUpload = async (file) => {
    if (!conversationId) {
      alert('请先创建对话');
      return;
    }

    try {
      setIsLoading(true);
      // 这里调用你的文件上传API
      const response = await api.uploadFile(file, conversationId);
      
      // 模拟文件上传处理
      console.log('上传文件:', file.name);
      
      // 添加文件上传消息到对话
      addMessage({
        id: Date.now().toString(),
        type: 'ai',
        content: `📁 文件 "${file.name}" 上传成功！正在分析中...`,
        timestamp: new Date().toLocaleTimeString(),
        toolCall: {
          name: 'file_uploader',
          status: 'completed'
        }
      });
       const insights = response.insights || "未获取到分析结果";
      // 分析完成
      setTimeout(() => {
        addMessage({
          id: Date.now().toString(),
          type: 'ai',
          content: `📄 文件 "${file.name}" 上传并分析完成！\n\n${insights}`,
          timestamp: new Date().toLocaleTimeString(),
          toolCall: {
            name: 'file_analyzer',
            status: 'completed'
          }
        });
      }, 2000);
      
    } catch (error) {
      console.error('文件上传失败:', error);
      addMessage({
        id: Date.now().toString(),
        type: 'ai',
        content: `❌ 文件上传失败: ${error.message}`,
        timestamp: new Date().toLocaleTimeString(),
        isError: true
      });
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <main className="chat-area">
      <div style={{ padding: '8px 12px' }}>
        <Space>
          <span>当前知识库:</span>
          <Select
            size="small"
            style={{ minWidth: 160 }}
            value={currentKB || undefined}
            onChange={setCurrentKB}
            options={(kbList || []).map(k => ({ label: k.name, value: k.name }))}
            placeholder="未选择"
            allowClear
          />
          <span style={{ color: '#999' }}>
            会话检索分片: {convStatus?.doc_chunks ?? '-'}
          </span>
          <Button size="small" onClick={async () => {
            if (!conversationId) return;
            try {
              const res = await fetch(`http://localhost:8000/api/chat/conversations/${conversationId}/retrieval/rebuild`, { method: 'POST' });
              if (!res.ok) throw new Error((await res.json()).detail || '重建失败');
              message.success('会话索引已重建');
              loadConvStatus();
            } catch (e) {
              message.error('重建失败');
            }
          }}>重建会话索引</Button>
        </Space>
      </div>
       
      <div className="chat-header">
        <div className="chat-title">
          <h2>{conversationId ? '对话' : '新对话'}</h2>
          <span className="chat-subtitle">与AI助手的对话</span>
        </div>
        <div className="chat-actions">
          <Space>
            <Button 
              icon={<FolderOpenOutlined />}
              onClick={() => setShowFileManager(!showFileManager)}
            >
              {showFileManager ? '隐藏文件管理' : '文件管理'}
            </Button>
            <Button 
              icon={<BarChartOutlined />}
              onClick={generateReport}
              disabled={!conversationId || isGeneratingReport}
              loading={isGeneratingReport}
            >
              生成报告
            </Button>
            <Button 
              icon={<ClearOutlined />}
              onClick={clearConversation}
              disabled={!conversationId}
            >
              清空对话
            </Button>
          </Space>
        </div>
      </div>
       {/* 文件管理器 */}
      {showFileManager && (
        <FileManager 
          conversationId={conversationId}
          onFileAnalyzed={handleFileAnalyzed}
        />
      )}
      <div className="chat-messages">
        {messages.map(message => (
          <div 
            key={message.id} 
            className={`message ${message.type}-message`}
          >
           {message.type === 'ai' && (
              <div className="avatar">
                <div className="ai-avatar">
                  {message.toolCall?.name === 'file_analyzer' ? '📄' : 
                   message.toolCall?.name === 'report_generator' ? '📊' : 
                   message.toolCall?.name === 'report_optimizer' ? '🔧' : '🤖'}
                </div>
              </div>
            )}
            
            <div className="message-content">
              <div className="message-bubble">
                <div className="message-text">{message.content}</div>
                
                {message.toolCall && (
                  <div className="tool-call">
                    <div className="tool-name">
                      
                    {message.toolCall.name === 'report_generator' && '📊 报告生成器'}
                    {message.toolCall.name === 'report_optimizer' && '🔧 报告优化器'}
                    {message.toolCall.name === 'file_analyzer' && '📄 文件分析器'}
                      </div>
                    <div className={`tool-status ${message.toolCall.status || 'pending'}`}>
                      {message.toolCall.status === 'pending' && (
                        <>
                          <span className="loading-icon">⏳</span>
                          <span>正在执行...</span>
                        </>
                      )}
                      {message.toolCall.status === 'completed' && '执行完成'}
                      {message.toolCall.status === 'error' && '执行失败'}
                    </div>
                  </div>
                )}
                
                {message.isError && (
                  <div className="error-message">
                    ⚠️ 发送消息时出现错误
                  </div>
                )}
              </div>
              
              <div className="message-actions">
                <button 
                  className="action-btn"
                  title="赞"
                >
                  👍
                </button>
                <button 
                  className="action-btn"
                  title="踩"
                >
                  👎
                </button>
                <button 
                  className="action-btn"
                  title="复制"
                  onClick={() => navigator.clipboard.writeText(message.content)}
                >
                  📋
                </button>
              </div>
            </div>
            
            {message.type === 'user' && (
              <div className="avatar">
                <div className="user-avatar">👤</div>
              </div>
            )}
          </div>
        ))}
        
        {/* 流式响应内容 */}
        {streamContent && (
          <div className="message ai-message">
            <div className="avatar">
              <div className="ai-avatar">🤖</div>
            </div>
            <div className="message-content">
              <div className="message-bubble">
                <div className="message-text">{streamContent}</div>
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* 加载状态 */}
        {isLoading && !streamContent && (
          <div className="message ai-message">
            <div className="avatar">
              <div className="ai-avatar">🤖</div>
            </div>
            <div className="message-content">
              <div className="message-bubble">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* 报告生成状态 */}
        {isGeneratingReport && (
          <div className="message ai-message">
            <div className="avatar">
              <div className="ai-avatar">📊</div>
            </div>
            <div className="message-content">
              <div className="message-bubble">
                <div className="message-text">正在生成报告...</div>
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
      <InputArea
        onSendMessage={handleSendMessage}
        onFileUpload={handleFileUpload}
        disabled={!conversationId}
      />

      {/* 报告预览模态框 */}
      {showReportModal && (
        <div className="report-modal">
          <div className="report-modal-content">
            <div className="report-modal-header">
              <h3>报告预览</h3>
              <div className="report-actions">
                <button onClick={() => optimizeReport('把结论写详细一点')}>
                  详细结论
                </button>
                <button onClick={() => optimizeReport('再加个图表')}>
                  添加图表
                </button>
                <button onClick={() => exportReport('pdf')}>
                  导出 PDF
                </button>
                <button onClick={() => exportReport('docx')}>
                  导出 Word
                </button>
                <button onClick={() => setShowReportModal(false)}>
                  关闭
                </button>
              </div>
            </div>
            <div className="report-content">
              <pre>{reportContent}</pre>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default ChatArea;
