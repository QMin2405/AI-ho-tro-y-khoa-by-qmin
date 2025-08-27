import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useUserStore } from '../store/useUserStore';
import { markdownToHtml } from '../utils/markdown';
import { ChatMessage } from '../types';
import { ChatAlt2Icon, MinusIcon, XIcon, CpuChipIcon, MaximizeIcon, RestoreDownIcon } from './icons';

// Memoized component to render a single chat message, preventing re-processing of markdown for old messages.
const MemoizedChatMessage = React.memo(({ msg }: { msg: ChatMessage }) => {
    const messageHtml = useMemo(() => markdownToHtml(msg.text), [msg.text]);

    return (
        <div className={`flex items-start gap-2.5 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
             {msg.sender === 'ai' && <div className="w-8 h-8 rounded-full bg-brand-primary/10 flex items-center justify-center flex-shrink-0"><CpuChipIcon className="w-5 h-5 text-brand-primary"/></div>}
            <div className={`p-3 rounded-xl ${msg.sender === 'user' ? 'bg-slate-200 dark:bg-gray-600 max-w-xs' : 'bg-background'}`}>
               <div className="prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: messageHtml }}></div>
            </div>
        </div>
    );
});


export const FloatingTutorPopup = () => {
    const {
        tutorState,
        tutorMessages,
        isTutorLoading,
        tutorContext,
        openTutor,
        closeTutor,
        minimizeTutor,
        toggleTutorSize,
        sendMessageToTutor,
        clearTutorContext,
    } = useUserStore();

    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [tutorMessages, isTutorLoading]);

    // Effect for auto-resizing the textarea
    useEffect(() => {
        const textarea = textareaRef.current;
        const chatContainer = chatContainerRef.current;
        if (textarea && chatContainer) {
            textarea.style.height = 'auto'; // Reset height to recalculate
            const scrollHeight = textarea.scrollHeight;
            const parentHeight = chatContainer.clientHeight;
            // Set max height to 1/3 of the container height
            const maxHeight = parentHeight / 3; 

            // Apply the new height, capped by the max height
            textarea.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
        }
    }, [input, tutorState]); // Rerun on input change or when the popup size changes

    const handleSend = () => {
        if (input.trim()) {
            sendMessageToTutor(input.trim());
            setInput('');
        }
    };
    
    if (tutorState === 'closed' || tutorState === 'minimized') {
        return (
             <button onClick={() => openTutor()} className="fixed bottom-5 right-5 p-4 bg-brand-primary text-white rounded-full shadow-lg hover:opacity-90 transition-transform hover:scale-110 z-30">
                <ChatAlt2Icon className="w-8 h-8" />
            </button>
        )
    }
    
    const isMaximized = tutorState === 'maximized';
    const popupClasses = `fixed bottom-5 right-5 bg-foreground rounded-2xl shadow-2xl flex flex-col z-40 animate-fade-in transition-all duration-300 ease-in-out ${
        isMaximized 
        ? 'w-full max-w-2xl h-[85vh]' 
        : 'w-full max-w-sm h-[60vh]'
    }`;

    return (
        <div className={popupClasses} ref={chatContainerRef}>
            <header className="p-4 border-b border-border flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <ChatAlt2Icon className="w-6 h-6 text-brand-primary"/>
                    <h3 className="text-lg font-bold">Gia sư AI</h3>
                </div>
                <div className="flex items-center gap-1">
                     <button onClick={minimizeTutor} className="p-2 rounded-full hover:bg-background"><MinusIcon className="w-5 h-5"/></button>
                     <button onClick={toggleTutorSize} className="p-2 rounded-full hover:bg-background">
                        {isMaximized ? <RestoreDownIcon className="w-5 h-5"/> : <MaximizeIcon className="w-5 h-5"/>}
                     </button>
                     <button onClick={closeTutor} className="p-2 rounded-full hover:bg-background"><XIcon className="w-5 h-5"/></button>
                </div>
            </header>
            <div className="flex-grow p-4 overflow-y-auto">
                <div className="space-y-4">
                     {tutorMessages.map((msg, index) => (
                        <MemoizedChatMessage key={index} msg={msg} />
                     ))}
                     {isTutorLoading && (
                         <div className="flex items-start gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-brand-primary/10 flex items-center justify-center flex-shrink-0"><CpuChipIcon className="w-5 h-5 text-brand-primary"/></div>
                             <div className="p-3 rounded-xl bg-background">
                                 {/* Typing indicator */}
                                 <div className="flex items-center gap-1">
                                    <span className="w-2 h-2 bg-text-secondary rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                    <span className="w-2 h-2 bg-text-secondary rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                    <span className="w-2 h-2 bg-text-secondary rounded-full animate-bounce"></span>
                                 </div>
                             </div>
                         </div>
                     )}
                    <div ref={messagesEndRef} />
                </div>
            </div>
            {tutorContext && (
                <div className="p-4 border-t border-border bg-background">
                    <p className="text-xs font-semibold text-text-secondary mb-1">Hỏi về ngữ cảnh:</p>
                    <div className="text-xs text-text-secondary p-2 bg-foreground rounded-md max-h-20 overflow-y-auto whitespace-pre-wrap">
                        {tutorContext}
                    </div>
                     <button onClick={clearTutorContext} className="text-xs text-brand-primary hover:underline mt-1">Xóa ngữ cảnh</button>
                </div>
            )}
            <div className="p-4 border-t border-border">
                <div className="flex items-end gap-2">
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        placeholder="Hỏi bất cứ điều gì..."
                        className="flex-grow p-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-brand-primary focus:outline-none resize-none overflow-y-auto"
                        rows={1}
                    />
                    <button onClick={handleSend} disabled={isTutorLoading || !input.trim()} className="p-3 bg-brand-primary text-white rounded-lg font-semibold hover:opacity-90 disabled:bg-slate-400 disabled:cursor-not-allowed h-full flex items-center">
                        Gửi
                    </button>
                </div>
                <p className="text-xs text-text-secondary mt-1.5 ml-1">
                    Nhấn <kbd className="font-sans border rounded px-1.5 py-0.5 text-xs bg-foreground dark:border-gray-600">Enter</kbd> để xuống dòng, <kbd className="font-sans border rounded px-1.5 py-0.5 text-xs bg-foreground dark:border-gray-600">Ctrl</kbd> + <kbd className="font-sans border rounded px-1.5 py-0.5 text-xs bg-foreground dark:border-gray-600">Enter</kbd> để gửi.
                </p>
            </div>
        </div>
    );
};