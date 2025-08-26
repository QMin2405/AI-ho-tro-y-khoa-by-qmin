import React, { useState, useRef } from 'react';
import { useUserStore } from '../store/useUserStore';
import { XIcon, ArrowUpTrayIcon, SparklesIcon } from './icons';

export const CreateStudyPackModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void; }) => {
    const createStudyPack = useUserStore(state => state.createStudyPack);
    const isLoading = useUserStore(state => state.isGenerating); // Use a shared loading state

    const [text, setText] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleCreate = async () => {
        if (!text.trim() && !file) {
            setError('Vui lòng dán văn bản hoặc tải lên một tệp để tạo gói học tập.');
            return;
        }
        setError('');

        try {
            const success = await createStudyPack({ text, file });
            if (success) {
                onClose(); // Close modal on successful creation
                setText('');
                setFile(null);
            } else {
                 setError('Tạo gói học tập thất bại. Vui lòng thử lại.');
            }
        } catch (err) {
            setError('Tạo gói học tập thất bại. Vui lòng thử lại.');
            console.error(err);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            handleCreate();
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setError('');
        }
    };
    
    const handleRemoveFile = () => {
        setFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-30 flex items-center justify-center p-4">
            <div className="bg-foreground rounded-2xl shadow-2xl w-full max-w-2xl transform transition-all animate-fade-in flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()} onKeyDown={handleKeyDown}>
                <div className="p-6 border-b border-border flex justify-between items-center">
                    <h2 className="text-2xl font-bold">Tạo Gói Học Tập Mới</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-background"><XIcon /></button>
                </div>
                <div className="p-6 overflow-y-auto">
                    <p className="mb-4 text-text-secondary">Dán ghi chú y khoa, văn bản bài báo, hoặc bất kỳ tài liệu học tập nào của bạn vào bên dưới.</p>
                    <textarea
                        value={text}
                        onChange={e => setText(e.target.value)}
                        placeholder="Dán nội dung của bạn vào đây..."
                        className="w-full h-40 p-3 border border-border rounded-lg bg-background focus:ring-2 focus:ring-brand-primary focus:outline-none"
                        disabled={isLoading}
                        autoFocus
                    />
                    
                    <div className="my-3 text-center text-text-secondary font-semibold">hoặc</div>

                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept="image/*,.pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.txt,text/plain"
                        disabled={isLoading}
                    />
                    <button 
                        onClick={() => fileInputRef.current?.click()} 
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-border rounded-lg text-text-secondary hover:bg-background transition-colors"
                        disabled={isLoading}
                    >
                        <ArrowUpTrayIcon className="w-6 h-6" />
                        <span>Tải tệp lên (Ảnh, PDF, Doc, Txt)</span>
                    </button>

                    {file && (
                         <div className="flex items-center justify-between text-sm mt-3 p-2 bg-background rounded-lg">
                            <span className="text-text-secondary truncate">
                                Tệp đã chọn: <span className="font-medium text-text-primary">{file.name}</span>
                            </span>
                            <button 
                                onClick={handleRemoveFile} 
                                className="p-1 rounded-full hover:bg-border text-text-secondary"
                                aria-label="Remove file"
                                disabled={isLoading}
                            >
                                <XIcon className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                    {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                </div>
                <div className="p-6 bg-background rounded-b-2xl flex justify-between items-center gap-4 border-t border-border">
                     <p className="text-xs text-text-secondary">
                        Hoặc nhấn <kbd className="font-sans border rounded px-1 py-0.5 text-xs bg-foreground dark:border-gray-600">Ctrl</kbd> + <kbd className="font-sans border rounded px-1 py-0.5 text-xs bg-foreground dark:border-gray-600">Enter</kbd>
                    </p>
                    <div className="flex items-center gap-4">
                        <button onClick={onClose} className="px-4 py-2 rounded-lg hover:bg-border font-semibold" disabled={isLoading}>Hủy</button>
                        <button onClick={handleCreate} className="px-6 py-2 bg-brand-primary text-white rounded-lg font-semibold flex items-center gap-2 hover:opacity-90 disabled:bg-slate-400 disabled:cursor-not-allowed min-w-[140px] justify-center" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    <span>Đang tạo...</span>
                                </>
                            ) : (
                                <>
                                    <SparklesIcon className="w-5 h-5" />
                                    <span>Tạo Gói</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};