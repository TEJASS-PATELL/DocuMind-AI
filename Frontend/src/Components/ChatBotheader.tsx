import React from 'react';
import { Settings, LogOut } from 'lucide-react';
import './ChatHeader.css';

interface ChatHeaderProps {
  setShowSettingsModal: (show: boolean) => void;
  handleLogout: () => void;
  handleNewChat: () => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  setShowSettingsModal,
  handleNewChat,
  handleLogout,
}) => {

  return (
    <header className="chat-header">
      <div className="chat-header-left">
        <button className="header-logo-btn" onClick={handleNewChat} title="New Chat">
          <img src="/DocuMind.png" alt="DocuMind" className="header-logo" />
        </button>
      </div>

      <div className="chat-header-actions">
        <button className="header-btn" onClick={() => setShowSettingsModal(true)} title="Settings">
          <Settings size={18} />
        </button>

        <div className="header-divider" />
        <button className="header-btn header-btn--danger" onClick={handleLogout} title="Sign out">
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
};

export default ChatHeader;