import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginOneClick } from './pages/LoginOneClick';
import { LoginVerification } from './pages/LoginVerification';
import { Home } from './pages/Home';
import { Chat } from './pages/Chat';
import { ProfileSettings } from './pages/ProfileSettings';
import { SystemSettings } from './pages/SystemSettings';

const App: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<LoginOneClick />} />
        <Route path="/login-verify" element={<LoginVerification />} />
        <Route path="/home" element={<Home />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/profile" element={<ProfileSettings />} />
        <Route path="/settings" element={<SystemSettings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
};

export default App;
