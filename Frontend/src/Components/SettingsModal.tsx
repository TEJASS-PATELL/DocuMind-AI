import React, { useState } from 'react';
import { X, Settings, Globe, MessageSquare, Zap, Save, Trash2, Palette } from 'lucide-react'; // Added Palette icon
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import './SettingsModal.css';

interface SettingsModalProps {
  onClose: () => void;
  current: {
    language: string;
    focusMode: boolean;
    replyType: string;
    userColor?: string; // NEW: Added userColor
  };
  onSave: (updated: { language: string; focusMode: boolean; replyType: string; userColor: string }) => void; // NEW: Added userColor
}

const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, current, onSave }) => {
  const navigate = useNavigate();

  const [language, setLanguage] = useState(current.language);
  const [focusMode, setFocusMode] = useState(current.focusMode);
  const [replyType, setReplyType] = useState(current.replyType);
  const [userColor, setUserColor] = useState(current.userColor || '#000000'); // NEW: State for color, default is black

  const userName = localStorage.getItem('username') || 'User';
  const email = localStorage.getItem('email') || 'No email found';

  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      const updatedSettings = { language, focusMode, replyType, userColor }; // Included userColor
      await api.post('/api/auth/update_detail', updatedSettings);
      toast.success('Preferences saved');
      onSave(updatedSettings);
      onClose();
    } catch {
      toast.error('Error saving preferences');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await api.delete('/api/auth/delete-account');
      toast.success('Account deleted');
      localStorage.clear();
      navigate('/login', { replace: true });
    } catch {
      toast.error('Error deleting account');
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel">
        <div className="modal-header">
          <div className="modal-header-left">
            <div className="modal-icon"><Settings size={15} /></div>
            <div>
              <h2 className="modal-title">Settings</h2>
              <p className="modal-subtitle">Profile and AI preferences</p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="setting-body">
          <div className="setting-profile">
            <div className="profile-avatar">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="profile-info">
              <div className="profile-name"><strong>{userName}</strong></div>
              <div className="profile-email">{email}</div>
            </div>
          </div>

          <div className="setting-divider" />
          <div className="setting-section-label">AI Preferences</div>

          <div className="setting-fields">
            <div className="setting-field">
              <label className="field-label"><Globe size={13} /> Language</label>
              <select className="field-select" value={language} onChange={e => setLanguage(e.target.value)}>
                <option value="english">English</option>
                <option value="hinglish">Hinglish</option>
                <option value="hindi">Hindi</option>
                <option value="marathi">Marathi</option>
                <option value="bengali">Bengali</option>
                <option value="tamil">Tamil</option>
                <option value="telugu">Telugu</option>
                <option value="kannada">Kannada</option>
                <option value="gujarati">Gujarati</option>
                <option value="punjabi">Punjabi</option>
                <option value="spanish">Spanish</option>
                <option value="french">French</option>
                <option value="russian">Russian</option>
                <option value="german">German</option>
              </select>
            </div>

            <div className="setting-field">
              <label className="field-label"><MessageSquare size={13} /> Reply Type</label>
              <select className="field-select" value={replyType} onChange={e => setReplyType(e.target.value)}>
                <option value="concise">Concise</option>
                <option value="balanced">Balanced</option>
                <option value="detailed">Detailed</option>
              </select>
            </div>

            {/* NEW: Chat Color Picker Field */}
            <div className="setting-field">
              <label className="field-label"><Palette size={13} /> Chat Color</label>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <input 
                  type="color" 
                  value={userColor} 
                  onChange={e => setUserColor(e.target.value)} 
                  style={{ cursor: 'pointer', padding: 0, border: 'none', width: '32px', height: '32px', borderRadius: '4px', background: 'transparent' }}
                />
                <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 500 }}>
                  {userColor.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="setting-field setting-field--toggle">
              <div className="toggle-info">
                <label className="field-label"><Zap size={13} /> Focus Mode</label>
                <span className="toggle-desc">Precise answers only</span>
              </div>
              <button
                className={`toggle-switch ${focusMode ? 'toggle-switch--on' : ''}`}
                onClick={() => setFocusMode(!focusMode)}
              >
                <span className="toggle-thumb" />
              </button>
            </div>
          </div>

          <div className="setting-divider" />

          <div className="setting-actions">
            <button className="setting-btn setting-btn--save" onClick={handleSubmit} disabled={isSaving}>
              <Save size={15} /> {isSaving ? 'Saving...' : 'Save Changes'}
            </button>

            <button className="setting-btn setting-btn--delete-init" onClick={handleDeleteAccount}>
              <Trash2 size={15} /> Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;