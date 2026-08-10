import React, { useEffect, useState, useMemo, useRef } from "react";
import "./Chatbot.css";
import SettingsModal from "../Components/SettingsModal";
import api from '../api';
import { useNavigate } from 'react-router-dom';
import ChatWindow from "../Components/ChatWindow";
import InputArea from "../Components/InputArea";
import { FileSearch, ShieldCheck, Zap, FileStack, Settings, LogOut, X, MessageSquarePlus, SlidersHorizontal } from "lucide-react";

interface Message {
  role: "user" | "model";
  text: string;
  status?: "success" | "error";
  fileName?: string;
}

const Chatbot: React.FC = () => {
  const navigate = useNavigate();
  const typingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [displayedText, setDisplayedText] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false); // Dropdown menu state
  const [sessionId, setSessionId] = useState<string>(`session-${Date.now()}`);

  const [settings, setSettings] = useState({
    language: "english",
    focusMode: false,
    replyType: "concise"
  });

  const isReadyToChat = useMemo(() => userId !== null, [userId]);
  const username = localStorage.getItem("username") || "there";
  const isEmptyState = messages.length === 0 && !displayedText;

  useEffect(() => {
    const initChatbot = async () => {
      try {
        const { data } = await api.get("/api/auth/get_detail");
        setUserId(data.id || null);
        setSettings({
          language: data.language || "english",
          focusMode: data.focusMode || false,
          replyType: data.replyType || "concise"
        });
      } catch {
        setUserId(null);
      }
    };
    initChatbot();

    return () => {
      if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
    };
  }, []);

  const handleNewChat = () => {
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
      typingIntervalRef.current = null;
    }
    setMessages([]);
    setDisplayedText("");
    setSessionId(`session-${Date.now()}`);
  };

  const typeMessage = (fullText: string) => {
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
    }

    let index = 0;
    setDisplayedText("");

    typingIntervalRef.current = setInterval(() => {
      setDisplayedText(prev => prev + fullText[index]);
      index++;
      if (index >= fullText.length) {
        if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
        setMessages(prev => [...prev, { role: "model", text: fullText }]);
        setDisplayedText("");
      }
    }, 15);
  };

  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("sessionId", sessionId);

    try {
      await api.post("/api/chats/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setMessages(prev => [
        ...prev,
        { role: "model", text: `"${file.name}" was processed successfully! You can now ask anything about it.`, status: "success", fileName: file.name }
      ]);
    } catch (error) {
      console.error("File upload failed:", error);
      setMessages(prev => [
        ...prev,
        { role: "model", text: `Error: something went wrong while processing "${file.name}".`, status: "error", fileName: file.name }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    const text = userInput.trim();
    if (!text || isLoading || !isReadyToChat) return;

    setMessages(prev => [...prev, { role: "user", text }]);
    setUserInput("");
    setIsLoading(true);

    try {
      const { data } = await api.post("/api/chats/startChat", {
        message: text,
        sessionId,
        language: settings.language,
        focusMode: settings.focusMode,
        replyType: settings.replyType
      });
      typeMessage(data?.reply || "No response.");
    } catch {
      setMessages(prev => [...prev, { role: "model", text: "Error: Connection failed." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post("/api/auth/logout");
      navigate("/login", { replace: true });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="container">
      <div className="main-box">
        <div className="chat-box">
          <div className="top-menu-wrapper">
            <div className={`slide-menu-dropdown ${isMenuOpen ? "open" : ""}`}>
              <button
                className="menu-item new-chat"
                onClick={handleNewChat}
                title="New Chat"
              >
                <MessageSquarePlus size={20} />
              </button>

              <div className="menu-divider-h" />

              <button
                className="menu-item"
                title="Settings"
                onClick={() => {
                  setShowSettingsModal(true);
                  setIsMenuOpen(false);
                }}
              >
                <Settings size={20} />
              </button>

              <div className="menu-divider-h" />

              <button
                className="menu-item menu-item--danger"
                title="Sign Out"
                onClick={() => {
                  handleLogout();
                  setIsMenuOpen(false);
                }}
              >
                <LogOut size={20} />
              </button>
            </div>

            <button
              className={`user-avatar-btn ${isMenuOpen ? "active" : ""}`}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              title={username}
            >
              <span className="icon-wrapper">
                {isMenuOpen ? <X size={22} /> : <SlidersHorizontal size={19} />}
              </span>
            </button>
          </div>

          {isEmptyState ? (
            <div className="empty-state">
              <div className="empty-state-inner">
                <h1 className="empty-greeting" style={{ display: 'flex', alignItems: 'center', gap: '5px', marginRight: '20px' }}>
                  <svg
                    viewBox="0 0 512 512"
                    xmlns="http://www.w3.org/2000/svg"
                    width="40"
                    className="spin-icon"
                    height="40"
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
                  <span>Back at it, <strong>{username}</strong></span>
                </h1>
                <p className="empty-subtitle">
                  Upload a document and ask me anything — I'll read it and find the best answers for you.
                </p>

                <InputArea
                  userInput={userInput}
                  setUserInput={setUserInput}
                  handleSendMessage={handleSendMessage}
                  handleFileUpload={handleFileUpload}
                  isLoading={isLoading}
                  isReadyToChat={isReadyToChat}
                />
              </div>
            </div>
          ) : (
            <div className="chat-body">
              <ChatWindow
                messages={messages}
                displayedText={displayedText}
                isLoading={isLoading}
              />

              <InputArea
                userInput={userInput}
                setUserInput={setUserInput}
                handleSendMessage={handleSendMessage}
                handleFileUpload={handleFileUpload}
                isLoading={isLoading}
                isReadyToChat={isReadyToChat}
              />
            </div>
          )}
        </div>
      </div>

      {showSettingsModal && (
        <SettingsModal
          onClose={() => setShowSettingsModal(false)}
          onSave={(updated) => setSettings(updated)}
          current={settings}
        />
      )}
    </div>
  );
};

export default Chatbot;