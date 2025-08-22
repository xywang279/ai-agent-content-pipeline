import React, { useState, useRef, useEffect } from 'react';
import './InputArea.scss';

const InputArea = ({ onSendMessage }) => {
  const [inputValue, setInputValue] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const textareaRef = useRef(null);

  const handleSend = () => {
    if (inputValue.trim()) {
      onSendMessage && onSendMessage(inputValue.trim());
      setInputValue('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [inputValue]);

  return (
    <footer className="input-area">
      <div className="input-tools">
        <button className="tool-btn" title="上传图片">
          📷
        </button>
        <button className="tool-btn" title="上传文件">
          📄
        </button>
        <button className="tool-btn" title="语音输入">
          🎤
        </button>
      </div>

      <div className="input-container">
        <textarea
          ref={textareaRef}
          className="message-input"
          placeholder="输入您的问题或指令... (Enter发送，Shift+Enter换行)"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          rows="1"
        />
      </div>

      <div className="send-container">
        <button 
          className={`send-btn ${inputValue.trim() ? 'active' : ''}`}
          onClick={handleSend}
          disabled={!inputValue.trim()}
        >
          ✈️
        </button>
      </div>
    </footer>
  );
};

export default InputArea;