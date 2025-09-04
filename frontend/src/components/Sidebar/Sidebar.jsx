import React, { useState, useEffect } from 'react';
import api from '../../api/chat';
import './Sidebar.scss';

const Sidebar = ({ onConversationSelect, currentConversationId }) => {
  const [recentChats, setRecentChats] = useState([]);
  const [loading, setLoading] = useState(false);

  // 获取对话列表
  const fetchConversations = async () => {
    try {
      setLoading(true);
      const response = await api.getAllConversations();
      setRecentChats(response.conversations || []);
    } catch (error) {
      console.error('获取对话列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 创建新对话
  const createNewConversation = async () => {
    try {
      const response = await api.createNewConversation();
      await fetchConversations();
      onConversationSelect(response.id);
    } catch (error) {
      console.error('创建新对话失败:', error);
    }
  };

  // 加载对话列表
  useEffect(() => {
    fetchConversations();
  }, []);

  // 当对话发生变化时刷新列表
  useEffect(() => {
    if (currentConversationId) {
      // 延迟刷新以确保对话已保存
      const timer = setTimeout(() => {
        fetchConversations();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [currentConversationId]);

  return (
    <aside className="sidebar">
      <div className="menu-section">
        <h3 className="section-title">功能菜单</h3>
        <ul className="menu-list">
          <li className="menu-item active">
            <span className="menu-icon">💬</span>
            <span>新对话</span>
            <button className="new-chat-btn" onClick={createNewConversation}>
              +
            </button>
          </li>
          <li className="menu-item">
            <span className="menu-icon">🛠️</span>
            <span>工具箱</span>
          </li>
          <li className="menu-item">
            <span className="menu-icon">👤</span>
            <span>个人助手</span>
          </li>
          <li className="menu-item">
            <span className="menu-icon">👥</span>
            <span>专业助手</span>
          </li>
        </ul>
      </div>

      <div className="recent-chats">
        <div className="section-header">
          <h3 className="section-title">最近对话</h3>
        </div>
        {loading ? (
          <div className="loading">加载中...</div>
        ) : (
          <ul className="chat-history">
            {recentChats.map(chat => (
              <li 
                key={chat.id} 
                className={`chat-item ${currentConversationId === chat.id ? 'active' : ''}`}
                onClick={() => onConversationSelect(chat.id)}
              >
                <div className="chat-content">
                  <div className="chat-title">{chat.title}</div>
                  <div className="chat-preview">{chat.preview}</div>
                </div>
                <div className="chat-time">{chat.time}</div>
              </li>
            ))}
            {recentChats.length === 0 && (
              <li className="empty-state">
                <div>暂无对话记录</div>
              </li>
            )}
          </ul>
        )}
      </div>

      <div className="sidebar-footer">
        <button className="settings-btn">
          <span className="settings-icon">⚙️</span>
          设置
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;