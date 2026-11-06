import React, { useRef, useState } from 'react';
import { ArrowUp, Plus, X, FileText, FileImage, File } from 'lucide-react';
import './InputArea.css';

interface UploadedFile {
    id: string;
    name: string;
    size: string;
    type: string;
}

interface InputAreaProps {
    userInput: string;
    setUserInput: (input: string) => void;
    handleSendMessage: () => void;
    handleFileUpload: (file: File) => Promise<void>;
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

    const isDisabled = !isReadyToChat;
    const canSend = !isLoading && isReadyToChat && userInput.trim().length > 0;

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

    const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (isLoading) return;
        const files = Array.from(e.target.files || []);
        const entries: UploadedFile[] = files.map((file, index) => ({
                id: `${file.name}-${Date.now()}-${index}`,
                name: file.name,
                size: fmtSize(file.size),
                type: file.type,
            }));
        setUploadedFiles(prev => [...prev, ...entries]);
        e.target.value = '';
        for (const file of files) {
            await handleFileUpload(file);
        }
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

            <div className={`input-shell${isDisabled || isLoading ? ' input-shell--disabled' : ''}`}>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={onFileChange}
                    accept=".pdf,.docx,.txt,.pptx,.xlsx,.odt,.odp,.ods,.rtf,.md,.html,.csv,.png,.jpg,.jpeg,.svg,.webp,.gif,.tif,.tiff,.avif,image/*"
                    multiple
                    style={{ display: 'none' }}
                />
                
                <button
                    className="input-btn input-btn--upload"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading || isDisabled}
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
                    placeholder="Ask anything about your document...."
                    disabled={isLoading || isDisabled}
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