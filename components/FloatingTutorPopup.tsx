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

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [tutorMessages, isTutorLoading]);
    
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
        <div className={popupClasses}>
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
                        // FIX: Pass the 'msg' prop to the MemoizedChatMessage component.
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
                <div className="p-2 border-t border-border bg-background/50 text-xs text-text-secondary">
                    <div className="flex justify-between items-center">
                        <p className="truncate"><strong>Bối cảnh:</strong> {tutorContext.replace(/\s+/g, ' ')}</p>
                        <button onClick={clearTutorContext} className="text-blue-500 hover:underline flex-shrink-0 ml-2">Xóa</button>
                    </div>
                </div>
            )}
            <div className="p-4 border-t border-border">
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {if(e.key === 'Enter') handleSend()}}
                        placeholder="Hỏi bất cứ điều gì..."
                        className="w-full p-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-brand-primary focus:outline-none"
                        disabled={isTutorLoading}
                    />
                    <button onClick={handleSend} className="p-2 bg-brand-primary text-white rounded-lg hover:opacity-90 disabled:bg-slate-400" disabled={!input.trim() || isTutorLoading}>
                        Gửi
                    </button>
                </div>
            </div>
        </div>
    );
};
