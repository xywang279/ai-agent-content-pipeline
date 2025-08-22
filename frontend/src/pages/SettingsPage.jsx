import React from 'react';
import Header from '../components/Header/Header';
import Settings from '../components/Settings/Settings';
import '../styles/variables.scss';

const SettingsPage = () => {
  return (
    <div className="app">
      <Header />
      <Settings />
    </div>
  );
};

export default SettingsPage;