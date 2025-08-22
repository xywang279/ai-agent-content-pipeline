import React from 'react';
import './Header.scss';

const Header = () => {
  return (
    <header className="header">
      <div className="logo">
        <div className="logo-icon">🤖</div>
        <span className="logo-text">AI Assistant</span>
      </div>

      <nav className="nav-menu">
        <ul className="nav-list">
          <li className="nav-item active">对话</li>
          <li className="nav-item">工具</li>
          <li className="nav-item">个人助手</li>
          <li className="nav-item">专业助手</li>
          <li className="nav-item">设置</li>
        </ul>
      </nav>

      <div className="user-actions">
        <div className="notification-badge">
          <span className="bell-icon">🔔</span>
          <span className="badge-count">3</span>
        </div>
        <div className="user-avatar">
          <span>👤</span>
        </div>
      </div>
    </header>
  );
};

export default Header;