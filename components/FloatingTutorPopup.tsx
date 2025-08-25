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
            <div className={`p-3 rounded-xl ${msg.sender === 'user' ? 'bg-slate-200 dark:bg-gray-600 max-w-xs' : 'bg-slate-100 dark:bg-gray-700'}`}>
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
    }, [tutorMessages]);
    
    const handleSend = () => {
        if (input.trim()) {
            sendMessageToTutor(input.trim());
            setInput('');
        }
    };
    
    if (tutorState === 'closed' || tutorState === 'minimized') {
        return (
             <button onClick={() => openTutor()} className="fixed bottom-5 right-5 p-4 bg-brand-primary text-white rounded-full shadow-lg hover:bg-blue-700 transition-transform hover:scale-110 z-30">
                <ChatAlt2Icon className="w-8 h-8" />
            </button>
        )
    }
    
    const isMaximized = tutorState === 'maximized';
    const popupClasses = `fixed bottom-5 right-5 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col z-40 animate-fade-in transition-all duration-300 ease-in-out ${
        isMaximized 
        ? 'w-full max-w-2xl h-[85vh]' 
        : 'w-full max-w-sm h-[60vh]'
    }`;

    return (
        <div className={popupClasses}>
            <header className="p-4 border-b border-slate-200 dark:border-gray-700 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <ChatAlt2Icon className="w-6 h-6 text-brand-primary"/>
                    <h3 className="text-lg font-bold">Gia sư AI</h3>
                </div>
                <div className="flex items-center gap-1">
                     <button onClick={minimizeTutor} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-gray-700"><MinusIcon className="w-5 h-5"/></button>
                     <button onClick={toggleTutorSize} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-gray-700">
                        {isMaximized ? <RestoreDownIcon className="w-5 h-5"/> : <MaximizeIcon className="w-5 h-5"/>}
                     </button>
                     <button onClick={closeTutor} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-gray-700"><XIcon className="w-5 h-5"/></button>
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
                            <div className="p-3 rounded-xl bg-slate-100 dark:bg-gray-700">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse"></div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>
             {tutorContext && (
                <div className="p-2 text-xs border-y border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-700/50 text-slate-500 dark:text-slate-400 flex justify-between items-center">
                    <p className="line-clamp-2"><b>Hỏi về:</b> {tutorContext}</p>
                    <button onClick={clearTutorContext} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-gray-600"><XIcon className="w-3 h-3"/></button>
                </div>
             )}
            <div className="p-4 border-t border-slate-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSend()}
                        placeholder="Hỏi bất cứ điều gì..."
                        className="w-full p-2 border border-slate-300 dark:border-gray-600 rounded-lg bg-slate-50 dark:bg-gray-900/50 focus:ring-1 focus:ring-brand-primary focus:outline-none"
                    />
                    <button onClick={handleSend} className="px-4 py-2 bg-brand-primary text-white rounded-lg font-semibold">Gửi</button>
                </div>
            </div>
        </div>
    );
};