import { useState, useEffect, useCallback } from 'react';
import api from '../api/chat';
import websocket from '../api/websocket';

export const useChat = () => {
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [conversations, setConversations] = useState([]);

  // 初始化 WebSocket
  useEffect(() => {
    websocket.connect();
    
    const handleMessage = (data) => {
      if (data.type === 'ai_response') {
        addMessage({
          id: Date.now().toString(),
          type: 'ai',
          content: data.content,
          timestamp: new Date().toLocaleTimeString(),
          toolCall: data.toolCall
        });
        setIsLoading(false);
      } else if (data.type === 'typing') {
        setIsLoading(true);
      }
    };

    websocket.on('message', handleMessage);

    return () => {
      websocket.off('message', handleMessage);
      websocket.disconnect();
    };
  }, []);

  // 添加消息
  const addMessage = useCallback((message) => {
    setMessages(prev => [...prev, message]);
  }, []);

  // 发送消息
  const sendMessage = useCallback(async (content) => {
    if (!content.trim() || isLoading) return;

    const userMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: content,
      timestamp: new Date().toLocaleTimeString()
    };
    
    addMessage(userMessage);
    setIsLoading(true);

    try {
      if (websocket.isConnected) {
        websocket.send({
          type: 'user_message',
          content: content,
          conversationId: conversationId
        });
      } else {
        const response = await api.sendMessage(content, conversationId);
        
        const aiMessage = {
          id: Date.now().toString(),
          type: 'ai',
          content: response.content,
          timestamp: new Date().toLocaleTimeString(),
          toolCall: response.toolCall
        };
        
        addMessage(aiMessage);
        setIsLoading(false);
        
        if (response.conversationId && !conversationId) {
          setConversationId(response.conversationId);
        }
      }
    } catch (error) {
      console.error('发送消息失败:', error);
      setIsLoading(false);
      
      addMessage({
        id: Date.now().toString(),
        type: 'ai',
        content: '抱歉，发送消息时出现错误。请稍后重试。',
        timestamp: new Date().toLocaleTimeString(),
        isError: true
      });
    }
  }, [addMessage, conversationId, isLoading]);

  // 创建新对话
  const createNewConversation = useCallback(async () => {
    try {
      const response = await api.createNewConversation();
      setConversationId(response.id);
      setMessages([]);
      return response.id;
    } catch (error) {
      console.error('创建新对话失败:', error);
      return null;
    }
  }, []);

  // 加载对话历史
  const loadConversation = useCallback(async (id) => {
    try {
      const response = await api.getConversationHistory(id);
      setConversationId(id);
      setMessages(response.messages || []);
    } catch (error) {
      console.error('加载对话历史失败:', error);
    }
  }, []);

  // 获取所有对话
  const loadConversations = useCallback(async () => {
    try {
      const response = await api.getAllConversations();
      setConversations(response.conversations || []);
    } catch (error) {
      console.error('获取对话列表失败:', error);
    }
  }, []);

  return {
    messages,
    conversationId,
    isLoading,
    conversations,
    sendMessage,
    createNewConversation,
    loadConversation,
    loadConversations,
    setMessages,
    setConversationId
  };
};