import React, { useState } from 'react';
import './Settings.scss';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState({
    defaultAssistant: 'general',
    saveHistory: true,
    theme: 'light',
    language: 'zh',
    dataCollection: false,
    personalization: true,
    desktopNotifications: true,
    soundReminders: false
  });

  const tabs = [
    { key: 'general', label: '通用设置' },
    { key: 'personal', label: '个性化' },
    { key: 'privacy', label: '隐私安全' },
    { key: 'notification', label: '通知' }
  ];

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h2>设置</h2>
      </div>

      <div className="settings-tabs">
        {tabs.map(tab => (
          <button
            key={tab.key}
            className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="settings-content">
        {activeTab === 'general' && (
          <div className="setting-group">
            <h3>对话设置</h3>
            <div className="setting-item">
              <label className="setting-label">默认AI助手</label>
              <select 
                className="select-input"
                value={settings.defaultAssistant}
                onChange={(e) => handleSettingChange('defaultAssistant', e.target.value)}
              >
                <option value="general">通用助手</option>
                <option value="professional">专业助手</option>
                <option value="personal">个人助手</option>
              </select>
            </div>
            
            <div className="setting-item">
              <label className="setting-label">对话历史保存</label>
              <div className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.saveHistory}
                  onChange={(e) => handleSettingChange('saveHistory', e.target.checked)}
                />
                <span className="slider"></span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'personal' && (
          <div className="setting-group">
            <h3>界面设置</h3>
            <div className="setting-item">
              <label className="setting-label">主题模式</label>
              <select 
                className="select-input"
                value={settings.theme}
                onChange={(e) => handleSettingChange('theme', e.target.value)}
              >
                <option value="light">浅色模式</option>
                <option value="dark">深色模式</option>
                <option value="auto">自动</option>
              </select>
            </div>
            
            <div className="setting-item">
              <label className="setting-label">语言</label>
              <select 
                className="select-input"
                value={settings.language}
                onChange={(e) => handleSettingChange('language', e.target.value)}
              >
                <option value="zh">中文</option>
                <option value="en">English</option>
                <option value="ja">日本語</option>
              </select>
            </div>
          </div>
        )}

        {activeTab === 'privacy' && (
          <div className="setting-group">
            <h3>隐私设置</h3>
            <div className="setting-item">
              <label className="setting-label">数据收集</label>
              <div className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.dataCollection}
                  onChange={(e) => handleSettingChange('dataCollection', e.target.checked)}
                />
                <span className="slider"></span>
              </div>
            </div>
            
            <div className="setting-item">
              <label className="setting-label">个性化推荐</label>
              <div className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.personalization}
                  onChange={(e) => handleSettingChange('personalization', e.target.checked)}
                />
                <span className="slider"></span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'notification' && (
          <div className="setting-group">
            <h3>通知设置</h3>
            <div className="setting-item">
              <label className="setting-label">桌面通知</label>
              <div className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.desktopNotifications}
                  onChange={(e) => handleSettingChange('desktopNotifications', e.target.checked)}
                />
                <span className="slider"></span>
              </div>
            </div>
            
            <div className="setting-item">
              <label className="setting-label">声音提醒</label>
              <div className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.soundReminders}
                  onChange={(e) => handleSettingChange('soundReminders', e.target.checked)}
                />
                <span className="slider"></span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;