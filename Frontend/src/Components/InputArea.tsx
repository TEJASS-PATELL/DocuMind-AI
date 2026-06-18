import React, { useRef, useState } from 'react';
import { ArrowUp, Plus, X, FileText, FileImage, File } from 'lucide-react';
import './InputArea.css';

interface UploadedFile {
  id: string;
  name: string;
  size: string;
  type: string;
  raw: File;
}

interface InputAreaProps {
  userInput: string;
  setUserInput: (input: string) => void;
  handleSendMessage: () => void;
  handleFileUpload: (file: File) => void;
  isLoading: boolean;
  isReadyToChat: boolean;
}

const FileIcon = ({ type }: { type: string }) => {
  if (type.includes('image')) return <FileImage size={13} />;
  if (type === 'application/pdf' || type.includes('text')) return <FileText size={13} />;
  return <File size={13} />;
};

const fmtSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const InputArea: React.FC<InputAreaProps> = ({
  userInput,
  setUserInput,
  handleSendMessage,
  handleFileUpload,
  isLoading,
  isReadyToChat,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  const isDisabled = isLoading || !isReadyToChat;
  const canSend = !isDisabled && (userInput.trim().length > 0 || uploadedFiles.length > 0);

  const triggerSend = () => {
    if (!canSend) return;
    handleSendMessage();
    setUploadedFiles([]); 
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && canSend) {
      e.preventDefault();
      triggerSend();
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const entry: UploadedFile = {
        id: `${file.name}-${Date.now()}`,
        name: file.name,
        size: fmtSize(file.size),
        type: file.type,
        raw: file,
      };
      setUploadedFiles(prev => [...prev, entry]);
      handleFileUpload(file); 
    });
    e.target.value = '';
  };

  const removeFile = (id: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== id));
  };

  return (
    <div className="input-area">
      {uploadedFiles.length > 0 && (
        <div className="file-chips">
          {uploadedFiles.map(file => (
            <div className="file-chip" key={file.id}>
              <span className="file-chip-icon">
                <FileIcon type={file.type} />
              </span>
              <div className="file-chip-info">
                <span className="file-chip-name">{file.name}</span>
                <span className="file-chip-size">{file.size}</span>
              </div>
              <button
                className="file-chip-remove"
                onClick={() => removeFile(file.id)}
                title="Remove file"
                type="button"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className={`input-shell${isDisabled ? ' input-shell--disabled' : ''}`}>
        <input
          type="file"
          ref={fileInputRef}
          onChange={onFileChange}
          accept=".pdf,.doc,.docx,.txt,.ppt,.pptx,.png,.jpg,.jpeg"
          multiple
          style={{ display: 'none' }}
        />
        
        <button
          className="input-btn input-btn--upload"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          title="Upload document"
          type="button"
        >
          <Plus size={18} strokeWidth={2.5} />
        </button>

        <textarea
          className="input-textarea"
          value={userInput}
          onChange={e => setUserInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything about your document..."
          disabled={isDisabled}
          rows={1}
        />

        <button
          className={`input-btn input-btn--send${canSend ? ' input-btn--active' : ''}`}
          onClick={triggerSend}
          disabled={!canSend}
          title="Send"
          type="button"
        >
          <ArrowUp size={16} />
        </button>
      </div>
    </div>
  );
};

export default InputArea;