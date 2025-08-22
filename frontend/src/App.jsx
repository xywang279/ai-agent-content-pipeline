import React, { useState } from 'react';
import ChatPage from './pages/ChatPage';
import ToolsPage from './pages/ToolsPage';
import SettingsPage from './pages/SettingsPage';
import './styles/variables.scss';
import './App.scss'; // 添加这个样式文件

const App = () => {
  const [currentPage, setCurrentPage] = useState('chat');

  const renderPage = () => {
    switch (currentPage) {
      case 'tools':
        return <ToolsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <ChatPage />;
    }
  };

  return (
    <div className="app-wrapper">
      <nav className="navigation">
        <button 
          className={`nav-button ${currentPage === 'chat' ? 'active' : ''}`}
          onClick={() => setCurrentPage('chat')}
        >
          对话
        </button>
        <button 
          className={`nav-button ${currentPage === 'tools' ? 'active' : ''}`}
          onClick={() => setCurrentPage('tools')}
        >
          工具
        </button>
        <button 
          className={`nav-button ${currentPage === 'settings' ? 'active' : ''}`}
          onClick={() => setCurrentPage('settings')}
        >
          设置
        </button>
      </nav>
      {renderPage()}
    </div>
  );
};

export default App;