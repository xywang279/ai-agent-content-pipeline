import React, { useState, useRef, useEffect } from 'react';
import { Upload, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import './InputArea.scss';

const InputArea = ({ onSendMessage, onFileUpload, disabled = false }) => {
  const [inputValue, setInputValue] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const textareaRef = useRef(null);

  const handleSend = () => {
    if (inputValue.trim() && !disabled) {
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

  const uploadProps = {
    name: 'file',
    showUploadList: false,
    disabled: disabled,
    customRequest: async (options) => {
      const { file, onSuccess, onError } = options;
      try {
        if (onFileUpload) {
          await onFileUpload(file);
        }
        onSuccess();
        message.success(`${file.name} 上传成功！`);
      } catch (error) {
        onError(error);
        message.error(`${file.name} 上传失败！`);
      }
    },
  };

  return (
    <footer className="input-area">
      <div className="input-tools">
        <button className="tool-btn" title="上传图片">
          📷
        </button>
        <Upload {...uploadProps}>
          <button 
            className="tool-btn" 
            title="上传文件"
            disabled={disabled}
          >
            📄
          </button>
        </Upload>
        <button className="tool-btn" title="语音输入">
          🎤
        </button>
      </div>

      <div className="input-container">
        <textarea
          ref={textareaRef}
          className="message-input"
          placeholder={disabled ? "请选择对话后开始聊天..." : "输入您的问题或指令... (Enter发送，Shift+Enter换行)"}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          rows="1"
          disabled={disabled}
        />
      </div>

      <div className="send-container">
        <button 
          className={`send-btn ${inputValue.trim() && !disabled ? 'active' : ''}`}
          onClick={handleSend}
          disabled={!inputValue.trim() || disabled}
        >
          ✈️
        </button>
      </div>
    </footer>
  );
};

export default InputArea;