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
            {msg.role === 'model'}
            
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