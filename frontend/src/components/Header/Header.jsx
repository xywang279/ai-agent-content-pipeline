import React, { useEffect, useState } from 'react';
import './Header.scss';

const Header = () => {
  const [active, setActive] = useState('chat');

  useEffect(() => {
    const computeActive = () => {
      const hash = window.location.hash || '#/chat';
      if (hash.startsWith('#/rag')) return 'rag';
      if (hash.startsWith('#/tools')) return 'tools';
      if (hash.startsWith('#/settings')) return 'settings';
      return 'chat';
    };
    setActive(computeActive());
    const onHashChange = () => setActive(computeActive());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const go = (target) => {
    window.location.hash = `#/${target}`;
  };

  return (
    <header className="header">
      <div className="logo" onClick={() => go('chat')} role="button" aria-label="返回首页">
        <div className="logo-icon">🤖</div>
        <span className="logo-text">AI Assistant</span>
      </div>

      <nav className="nav-menu">
        <ul className="nav-list">
          <li className={`nav-item ${active === 'chat' ? 'active' : ''}`} onClick={() => go('chat')}>对话</li>
          <li className={`nav-item ${active === 'tools' ? 'active' : ''}`} onClick={() => go('tools')}>工具</li>
          <li className={`nav-item ${active === 'rag' ? 'active' : ''}`} onClick={() => go('rag')}>RAG</li>
          {/* 预留：个人助手、专业助手可跳转到 tools 或相应页面 */}
          <li className="nav-item disabled" title="即将推出">个人助手</li>
          <li className="nav-item disabled" title="即将推出">专业助手</li>
          <li className={`nav-item ${active === 'settings' ? 'active' : ''}`} onClick={() => go('settings')}>设置</li>
        </ul>
      </nav>

      <div className="user-actions">
        <div className="search">
          <span className="search-icon">🔎</span>
          <input className="search-input" placeholder="搜索对话/工具" />
        </div>
        <div className="notification-badge" title="通知">
          <span className="bell-icon">🔔</span>
          <span className="badge-count">3</span>
        </div>
        <div className="user-avatar" title="账户">
          <span>👤</span>
        </div>
      </div>
    </header>
  );
};

export default Header;
