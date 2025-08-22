import React, { useState, useEffect, useRef } from 'react';
import api from '../../api/chat';
import websocket from '../../api/websocket';
import './ChatArea.scss';

const ChatArea = ({ onSendMessage }) => {
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [streamContent, setStreamContent] = useState(''); // 用于流式响应
  const messagesEndRef = useRef(null);

  // 滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamContent]);

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
  }, []);

  // 添加消息到聊天记录
  const addMessage = (message) => {
    setMessages(prev => [...prev, message]);
    console.log('setMessages log', message);
  };

  // 发送消息
  const handleSendMessage = async (content) => {
    if (!content.trim() || isLoading) return;

    // 添加用户消息
    const userMessage = {
      id: Date.now().toString(),
      type: 'user_message',
      content: content,
      timestamp: new Date().toLocaleTimeString()
    };
    
    addMessage(userMessage);

    try {
      // 通过 WebSocket 发送消息
      if (websocket.isConnected) {
        const messageData = {
          type: 'user_message',
          content: content,
          conversation_id: conversationId
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
      
      // 更新对话 ID
      if (response.conversation_id && !conversationId) {
        setConversationId(response.conversation_id);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 创建新对话
  const createNewConversation = async () => {
    try {
      const response = await api.createNewConversation();
      setConversationId(response.id || response.conversation_id);
      setMessages([]);
    } catch (error) {
      console.error('创建新对话失败:', error);
    }
  };

  // 清空对话
  const clearConversation = () => {
    console.log('清空对话被调用');
    setMessages([]);
    setConversationId(null);
    setStreamContent('');
    createNewConversation();
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

  return (
    <main className="chat-area">
      <div className="chat-header">
        <div className="chat-title">
          <h2>新对话</h2>
          <span className="chat-subtitle">与AI助手的对话</span>
        </div>
        <div className="chat-actions">
          <button className="action-btn" onClick={clearConversation}>
            清空对话
          </button>
          <button className="action-btn" onClick={saveConversation} disabled={!conversationId}>
            保存对话
          </button>
        </div>
      </div>

      <div className="chat-messages">
        {messages.map(message => (
          <div 
            key={message.id} 
            className={`message ${message.type}-message`}
          >
            {message.type === 'ai' && (
              <div className="avatar">
                <div className="ai-avatar">🤖</div>
              </div>
            )}
            
            <div className="message-content">
              <div className="message-bubble">
                <div className="message-text">{message.content}</div>
                
                {message.toolCall && (
                  <div className="tool-call">
                    <div className="tool-name">{message.toolCall.name || '工具调用'}</div>
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
        
        <div ref={messagesEndRef} />
      </div>
    </main>
  );
};

export default ChatArea;