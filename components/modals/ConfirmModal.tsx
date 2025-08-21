
import React from 'react';

export const ConfirmModal = ({ title, text, confirmText, onConfirm, onCancel, isDestructive = true }: { title: string; text: string; confirmText: string; onConfirm: () => void; onCancel: () => void; isDestructive?: boolean; }) => (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6 transform transition-all animate-fade-in" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">{title}</h2>
            <p className="text-slate-600 dark:text-slate-300 mb-6">{text}</p>
            <div className="flex justify-end gap-4">
                <button onClick={onCancel} className="px-4 py-2 rounded-lg hover:bg-slate-200 dark:hover:bg-gray-700 font-semibold">Hủy</button>
                <button 
                    onClick={onConfirm} 
                    className={`px-4 py-2 text-white rounded-lg font-semibold ${
                        isDestructive 
                        ? 'bg-red-600 hover:bg-red-700' 
                        : 'bg-brand-primary hover:bg-blue-700'
                    }`}
                >
                    {confirmText}
                </button>
            </div>
        </div>
    </div>
);
