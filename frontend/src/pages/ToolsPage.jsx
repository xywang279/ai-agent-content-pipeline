import React from 'react';
import Header from '../components/Header/Header';
import { ToolCards } from '../components/ToolCard/ToolCard';
import '../styles/variables.scss';

const ToolsPage = () => {
  return (
    <div className="app">
      <Header />
      <div className="tools-container">
        <div className="tools-header">
          <h2>工具箱</h2>
          <p>集成各种实用工具，提升工作效率</p>
        </div>
        <ToolCards />
      </div>
    </div>
  );
};

export default ToolsPage;