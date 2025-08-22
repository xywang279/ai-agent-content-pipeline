import React from 'react';
import './Sidebar.scss';

const Sidebar = () => {
  const recentChats = [
    {
      id: '1',
      title: '项目计划讨论',
      preview: '帮我制定一个项目时间表...',
      time: '2小时前'
    },
    {
      id: '2',
      title: '数据分析报告',
      preview: '分析上个月的销售数据',
      time: '昨天'
    },
    {
      id: '3',
      title: '旅行规划',
      preview: '推荐一些旅游景点',
      time: '3天前'
    }
  ];

  return (
    <aside className="sidebar">
      <div className="menu-section">
        <h3 className="section-title">功能菜单</h3>
        <ul className="menu-list">
          <li className="menu-item active">
            <span className="menu-icon">💬</span>
            <span>新对话</span>
            <button className="new-chat-btn">
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
        <ul className="chat-history">
          {recentChats.map(chat => (
            <li key={chat.id} className="chat-item">
              <div className="chat-content">
                <div className="chat-title">{chat.title}</div>
                <div className="chat-preview">{chat.preview}</div>
              </div>
              <div className="chat-time">{chat.time}</div>
            </li>
          ))}
        </ul>
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