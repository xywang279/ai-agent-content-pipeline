import React, { useState } from 'react';
import Header from '../components/Header/Header';
import Sidebar from '../components/Sidebar/Sidebar';
import ChatArea from '../components/ChatArea/ChatArea';
import InputArea from '../components/InputArea/InputArea';
import '../styles/variables.scss';
import './ChatPage.scss';


const ChatPage = () => {
  const [currentConversationId, setCurrentConversationId] = useState(null);

  const handleConversationSelect = (conversationId) => {
    setCurrentConversationId(conversationId);
  };

  const handleConversationUpdate = (conversationId) => {
    // 当对话更新时，可以触发其他操作
    console.log('对话已更新:', conversationId);
  };

  return (
    <div className="chat-page">
      <Header />
      <div className="chat-main">
        <Sidebar 
          onConversationSelect={handleConversationSelect}
          currentConversationId={currentConversationId}
        />
        <div className="chat-content">
           <ChatArea 
            conversationId={currentConversationId}
            onConversationUpdate={handleConversationUpdate}
          />
          {/* <InputArea  onSendMessage={handleSendMessage}/> */}
          {/* <InputArea 
            onSendMessage={handleSendMessage}
            disabled={!currentConversationId}
          /> */}
           {/* 不要在这里传 handleSendMessage，直接让 ChatArea 负责消息发送 */}
          {/* <InputArea disabled={!currentConversationId} onFileUpload={handleFileUpload} onSendMessage={content => window.dispatchEvent(new CustomEvent('sendMessage', { detail: content }))} /> */}
        </div>
        </div>
      </div>
    
  );
};

export default ChatPage;