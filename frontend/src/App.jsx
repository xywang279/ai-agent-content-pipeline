import React, { useEffect, useMemo, useState } from 'react';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/lib/locale/zh_CN';
import 'antd/dist/reset.css'; // 或者 'antd/dist/antd.css'
import ChatPage from './pages/ChatPage';
import ToolsPage from './pages/ToolsPage';
import SettingsPage from './pages/SettingsPage';
import RAGPage from './pages/RAGPage';
import './styles/variables.scss';
import './App.scss'; // 添加这个样式文件

const App = () => {
  const getPageFromHash = () => {
    const hash = window.location.hash || '#/chat';
    if (hash.startsWith('#/rag')) return 'rag';
    if (hash.startsWith('#/tools')) return 'tools';
    if (hash.startsWith('#/settings')) return 'settings';
    return 'chat';
  };

  const [currentPage, setCurrentPage] = useState(getPageFromHash());

  useEffect(() => {
    const onHashChange = () => setCurrentPage(getPageFromHash());
    if (!window.location.hash) {
      window.location.hash = '#/chat';
    }
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'rag':
        return <RAGPage />;
      case 'tools':
        return <ToolsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <ChatPage />;
    }
  };

  return (
    <ConfigProvider locale={zhCN}>
      {/* <div className="app">
        <ChatPage />
      </div> */}
    
    <div className="app-wrapper">
      {/* <nav className="navigation">
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
      </nav> */}
      {renderPage()}
    </div>
    </ConfigProvider>
  );
};

export default App;
