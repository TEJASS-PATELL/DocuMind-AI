import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { ArrowDown } from 'lucide-react';
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
  userColor?: string;
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

const ChatWindow: React.FC<ChatWindowProps> = ({ messages, displayedText, isLoading, userColor = '#000000' }) => {
  const chatWindowRef = useRef<HTMLDivElement>(null);
  const shouldFollowLatestRef = useRef(true);
  const isProgrammaticScrollRef = useRef(false);
  const autoScrollTimerRef = useRef<number | null>(null);
  const programmaticScrollTimerRef = useRef<number | null>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  const stopProgrammaticScroll = useCallback(() => {
    const chatWindow = chatWindowRef.current;
    if (chatWindow && isProgrammaticScrollRef.current) {
      chatWindow.scrollTo({ top: chatWindow.scrollTop, behavior: 'auto' });
    }

    isProgrammaticScrollRef.current = false;
    if (programmaticScrollTimerRef.current !== null) {
      window.clearTimeout(programmaticScrollTimerRef.current);
      programmaticScrollTimerRef.current = null;
    }
    if (autoScrollTimerRef.current !== null) {
      window.clearTimeout(autoScrollTimerRef.current);
      autoScrollTimerRef.current = null;
    }
  }, []);

  const pauseAutoFollow = useCallback(() => {
    if (autoScrollTimerRef.current !== null) {
      window.clearTimeout(autoScrollTimerRef.current);
      autoScrollTimerRef.current = null;
    }
    shouldFollowLatestRef.current = false;
  }, []);

  const stopFollowingDuringManualScroll = useCallback(() => {
    stopProgrammaticScroll();
    pauseAutoFollow();
  }, [pauseAutoFollow, stopProgrammaticScroll]);

  const scrollToLatest = useCallback(() => {
    const chatWindow = chatWindowRef.current;
    if (!chatWindow) return;

    shouldFollowLatestRef.current = true;
    isProgrammaticScrollRef.current = true;
    chatWindow.scrollTo({ top: chatWindow.scrollHeight, behavior: 'smooth' });

    if (programmaticScrollTimerRef.current !== null) {
      window.clearTimeout(programmaticScrollTimerRef.current);
    }
    programmaticScrollTimerRef.current = window.setTimeout(() => {
      isProgrammaticScrollRef.current = false;
      programmaticScrollTimerRef.current = null;
    }, 500);
  }, []);

  useEffect(() => {
    if (!shouldFollowLatestRef.current || autoScrollTimerRef.current !== null) return;

    autoScrollTimerRef.current = window.setTimeout(() => {
      autoScrollTimerRef.current = null;
      if (shouldFollowLatestRef.current) {
        const chatWindow = chatWindowRef.current;
        if (chatWindow) chatWindow.scrollTop = chatWindow.scrollHeight;
      }
    }, 100);
  }, [messages, isLoading, displayedText, scrollToLatest]);

  useEffect(() => () => {
    if (autoScrollTimerRef.current !== null) window.clearTimeout(autoScrollTimerRef.current);
    if (programmaticScrollTimerRef.current !== null) window.clearTimeout(programmaticScrollTimerRef.current);
  }, []);

  return (
    <div className="chat-window-shell">
      <div
        className="chat-window"
        ref={chatWindowRef}
        onScroll={(event) => {
          const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
          const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
          setShowScrollToBottom(distanceFromBottom >= 48);
          if (!isProgrammaticScrollRef.current) {
            shouldFollowLatestRef.current = distanceFromBottom < 48;
          }
        }}
        onWheel={stopFollowingDuringManualScroll}
        onTouchStart={stopFollowingDuringManualScroll}
        onPointerDown={stopProgrammaticScroll}
      >
        <div className="chat-window-inner">
          {messages.map((msg, i) => (
            <div key={i} className={`msg-row msg-row--${msg.role}`}>
              <div
                className="msg-bubble"
                style={msg.role === 'user' ? { backgroundColor: userColor } : {}}
              >
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
                <span></span>
              </div>
            </div>
          )}
        </div>
      </div>
      {showScrollToBottom && (
        <button
          type="button"
          className="scroll-to-bottom"
          aria-label="Scroll to latest message"
          title="Scroll to latest message"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={scrollToLatest}
        >
          <ArrowDown size={20} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
};

export default ChatWindow;