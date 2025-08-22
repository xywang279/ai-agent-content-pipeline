import React from 'react';
import './ToolCard.scss';

const ToolCard = ({ title, description, icon, onUse }) => {
  return (
    <div className="tool-card">
      <div className="tool-icon">
        {icon}
      </div>
      <h3 className="tool-title">{title}</h3>
      <p className="tool-description">{description}</p>
      <button 
        className="use-tool-btn"
        onClick={onUse}
      >
        使用
      </button>
    </div>
  );
};

export const ToolCards = () => {
  const tools = [
    {
      title: '计算器',
      description: '高级数学计算和数据分析',
      icon: '🔢',
      onUse: () => console.log('使用计算器')
    },
    {
      title: '翻译器',
      description: '多语言实时翻译',
      icon: '🌐',
      onUse: () => console.log('使用翻译器')
    },
    {
      title: '日程管理',
      description: '智能时间安排和提醒',
      icon: '📅',
      onUse: () => console.log('使用日程管理')
    },
    {
      title: '搜索引擎',
      description: '实时信息检索',
      icon: '🔍',
      onUse: () => console.log('使用搜索引擎')
    }
  ];

  return (
    <div className="tools-grid">
      {tools.map((tool, index) => (
        <ToolCard key={index} {...tool} />
      ))}
    </div>
  );
};

export default ToolCard;