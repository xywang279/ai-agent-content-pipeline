import React from 'react';
import Header from '../components/Header/Header';
import Sidebar from '../components/Sidebar/Sidebar';
import ChatArea from '../components/ChatArea/ChatArea';
import InputArea from '../components/InputArea/InputArea';
import '../styles/variables.scss';
import './ChatPage.scss';


const ChatPage = () => {
  return (
    <div className="chat-page">
      <Header />
      <div className="chat-main">
        <Sidebar />
        <div className="chat-content">
          <ChatArea />
          {/* <InputArea  onSendMessage={handleSendMessage}/> */}
           {/* 不要在这里传 handleSendMessage，直接让 ChatArea 负责消息发送 */}
          <InputArea onSendMessage={content => window.dispatchEvent(new CustomEvent('sendMessage', { detail: content }))} />
        </div>
        </div>
      </div>
    
  );
};

export default ChatPage;