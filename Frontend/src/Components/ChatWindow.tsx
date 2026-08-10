import React, { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  FaFilePdf, FaFileWord, FaFilePowerpoint, FaFileExcel, FaFileCsv, FaFileAlt, FaFile,
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

const AiIcon: React.FC<{ isSpinning?: boolean }> = ({ isSpinning = false }) => (
  <div className="ai-avatar-wrapper">
    <svg
      viewBox="0 0 512 512"
      xmlns="http://www.w3.org/2000/svg"
      width="40"
      height="40"
      className={`ai-icon-svg ${isSpinning ? 'spin-icon' : ''}`}
      style={{ flexShrink: 0 }}
    >
      <g transform="translate(256, 256)">
        <path
          d="M 0 -140 C 35 -45 45 -35 140 0 C 45 35 35 45 0 140 C -35 45 -45 35 -140 0 C -45 -35 -35 -45 0 -140 Z"
          fill="#1A1A1A"
        />
        <path
          d="M 0 -85 C 22 -28 28 -22 85 0 C 28 22 22 28 0 85 C -22 28 -28 22 -85 0 C -28 -22 -22 -28 0 -85 Z"
          fill="#2A5C45"
        />
        <circle cx="0" cy="0" r="16" fill="#FFFFFF" />
      </g>
    </svg>
  </div>
);

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

  useEffect(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, [messages, isLoading, displayedText]);

  return (
    <div className="chat-window" ref={chatWindowRef}>
      <div className="chat-window-inner">
        {messages.map((msg, i) => (
          <div key={i} className={`msg-row msg-row--${msg.role}`}>
            {msg.role === 'model' && <AiIcon />}
            
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
            <AiIcon isSpinning={true} />
            <div className="msg-bubble">
              <ReactMarkdown>{displayedText}</ReactMarkdown>
            </div>
          </div>
        )}

        {isLoading && !displayedText && (
          <div className="msg-row msg-row--model">
            <AiIcon isSpinning={true} />
            <div className="msg-bubble msg-bubble--typing">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatWindow;