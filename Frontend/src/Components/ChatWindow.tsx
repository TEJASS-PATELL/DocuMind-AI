import React, { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  FaFilePdf, FaSearch, FaChartBar, FaFileAlt,
  FaShieldAlt, FaBolt, FaPlus,
  FaFileWord, FaFilePowerpoint, FaFileExcel, FaFileCsv, FaFile,
} from 'react-icons/fa';
import './ChatWindow.css';

interface Message {
  role: 'user' | 'model';
  text: string;
  status?: 'success' | 'error';
  fileName?: string;
}

interface ChatWindowProps {
  messages: Message[];
  displayedText: string;
  isLoading: boolean;
}

const TAGS = [
  { icon: <FaFilePdf />, label: 'PDF Analysis' },
  { icon: <FaSearch />, label: 'Semantic Search' },
  { icon: <FaChartBar />, label: 'Data & Tables' },
  { icon: <FaFileAlt />, label: 'Research Papers' },
  { icon: <FaShieldAlt />, label: 'Private & Secure' },
  { icon: <FaBolt />, label: 'Instant Answers' },
  { icon: <FaPlus />, label: 'Explore More', more: true },
];

const SUGGESTIONS = [
  'Summarize the key findings of this document',
  'What does section 3 say about revenue?',
  'List all action items mentioned in the report',
  'Compare the data in tables 2 and 4',
];

const getFileIcon = (fileName?: string) => {
  const ext = fileName?.split('.').pop()?.toLowerCase() || '';

  switch (ext) {
    case 'pdf':
      return <FaFilePdf className="file-icon file-icon--pdf" />;
    case 'docx':
    case 'doc':
      return <FaFileWord className="file-icon file-icon--docx" />;
    case 'pptx':
    case 'ppt':
      return <FaFilePowerpoint className="file-icon file-icon--pptx" />;
    case 'xlsx':
    case 'xls':
      return <FaFileExcel className="file-icon file-icon--xlsx" />;
    case 'csv':
      return <FaFileCsv className="file-icon file-icon--csv" />;
    case 'txt':
    case 'md':
      return <FaFileAlt className="file-icon file-icon--txt" />;
    default:
      return <FaFile className="file-icon file-icon--default" />;
  }
};

const ChatWindow: React.FC<ChatWindowProps> = ({ messages, displayedText, isLoading }) => {
  const chatWindowRef = useRef<HTMLDivElement>(null);
  const username = localStorage.getItem('username') || 'None';

  useEffect(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, [messages, isLoading, displayedText]);

  return (
    <div className="chat-window" ref={chatWindowRef}>
      {messages.length === 0 && (
        <div className="chat-intro">
          <div className="chat-intro-status">
            <span className="status-text">DocuMind Core v2.0 Active</span>
          </div>

          <h2 className="intro-heading">
            {username ? <>Hey, <strong>{username}</strong></> : 'Welcome'}
          </h2>

          <p className="intro-sub">
            I'm <strong>DocuMind AI</strong> — upload a document and ask me anything.
          </p>

          <div className="intro-tags">
            {TAGS.map(t => (
              <span className={`intro-tag${t.more ? ' intro-tag--more' : ''}`} key={t.label}>
                {t.icon} {t.label}
              </span>
            ))}
          </div>

          <div className="intro-features-grid">
            <div className="feature-cards">
              <div className="feature-card-title">Instant Analysis</div>
              <div className="feature-card-desc">Extract key insights from long documents in seconds.</div>
            </div>
            <div className="feature-cards">
              <div className="feature-card-title">Smart Query</div>
              <div className="feature-card-desc">Ask complex questions and get context-aware answers.</div>
            </div>
          </div>

          <div className="intro-suggestions">
            <p className="suggestions-label">Try asking:</p>
            <div className="suggestions-list">
              {SUGGESTIONS.map(s => (
                <span className="suggestion-chip" key={s}>{s}</span>
              ))}
            </div>
          </div>

          <p className="intro-note">
            Upload a document using the <strong>+</strong> button, then start chatting.
          </p>
        </div>
      )}

      {messages.map((msg, i) => (
        <div key={i} className={`msg-row msg-row--${msg.role}`}>
          <div className="msg-bubble">
            {msg.fileName && (
              <div className="msg-file-indicator">
                {getFileIcon(msg.fileName)}
              </div>
            )}
            {msg.role === 'model' ? <ReactMarkdown>{msg.text}</ReactMarkdown> : <p>{msg.text}</p>}
          </div>
        </div>
      ))}

      {displayedText && (
        <div className="msg-row msg-row--model">
          <div className="msg-bubble">
            <ReactMarkdown>{displayedText}</ReactMarkdown>
          </div>
        </div>
      )}

      {isLoading && !displayedText && (
        <div className="msg-row msg-row--model">
          <div className="msg-bubble msg-bubble--typing">
            <span /><span /><span /><span />
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatWindow;