import React, { useState, useEffect, useRef } from 'react';
import { useUserStore } from '../../store/useUserStore';
import { getLevelInfo } from '../../utils/helpers';
import { LEVEL_NAMES, LEVEL_THRESHOLDS } from '../../constants';
import { XIcon, PencilIcon, ArrowDownTrayIcon, ArrowUpTrayIcon } from '../icons';

interface XpModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const XpModal: React.FC<XpModalProps> = ({ isOpen, onClose }) => {
    const name = useUserStore(state => state.name);
    const xp = useUserStore(state => state.xp);
    const isLoggedIn = useUserStore(state => state.isLoggedIn);
    const changeName = useUserStore(state => state.changeName);
    const logout = useUserStore(state => state.logout);
    const importUserData = useUserStore(state => state.importUserData);

    const [editingName, setEditingName] = useState(name);
    const [isEditing, setIsEditing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setEditingName(name);
    }, [name]);
    
    const handleSave = () => {
        changeName(editingName);
        setIsEditing(false);
    };

    const handleDataImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            importUserData(file);
        }
        if(e.target) e.target.value = ''; // Reset file input
        onClose(); // Close modal after import
    };

    if (!isOpen) return null;

    const { level, name: levelName, progress, nextLevelXP } = getLevelInfo(xp);

    return (
        <div className="fixed inset-0 bg-black/60 z-30 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg transform transition-all animate-fade-in flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-200 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-2xl font-bold">Lộ trình Cấp độ</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-gray-700"><XIcon /></button>
                </div>
                <div className="p-6 overflow-y-auto">
                    <div className="flex items-center gap-4 mb-4">
                        {isEditing ? (
                            <input 
                                type="text"
                                value={editingName}
                                onChange={e => setEditingName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSave()}
                                onBlur={handleSave}
                                className="text-2xl font-bold bg-transparent border-b-2 border-brand-primary focus:outline-none"
                                autoFocus
                            />
                        ) : (
                            <h3 className="text-2xl font-bold">{name}</h3>
                        )}
                        <button onClick={() => setIsEditing(!isEditing)} className="p-1 text-slate-500 hover:text-brand-primary">
                            <PencilIcon className="w-5 h-5" />
                        </button>
                    </div>
                    
                    <div className="mb-6">
                        <div className="flex justify-between items-center mb-1 text-sm">
                            <span className="font-semibold">Cấp {level}: {levelName}</span>
                            <span className="font-mono">{xp} / {nextLevelXP} XP</span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-gray-700 rounded-full h-4">
                            <div className="bg-brand-secondary h-4 rounded-full flex items-center justify-center text-xs text-white font-bold" style={{ width: `${progress}%` }}>
                                {Math.round(progress)}%
                            </div>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 text-right">
                           Cần {nextLevelXP - xp} XP nữa để lên cấp
                        </p>
                    </div>

                    <h4 className="font-bold mb-2">Các cấp độ tiếp theo:</h4>
                    <ul className="space-y-1 text-sm">
                        {LEVEL_NAMES.slice(level, level + 5).map((name, index) => (
                            <li key={index} className="flex justify-between p-2 rounded-md bg-slate-100 dark:bg-gray-700/50">
                                <span>Cấp {level + index + 1}: {name}</span>
                                <span className="font-mono text-slate-500 dark:text-slate-400">{LEVEL_THRESHOLDS[level + index + 1] || 'MAX'} XP</span>
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="p-6 bg-slate-50 dark:bg-gray-800/50 rounded-b-2xl flex justify-between items-center gap-4 border-t border-slate-200 dark:border-gray-700">
                    {isLoggedIn ? (
                        <button onClick={logout} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900 font-semibold">
                            <ArrowDownTrayIcon className="w-5 h-5" />
                            <span>Đăng xuất (Xuất Dữ liệu)</span>
                        </button>
                    ) : (
                        <>
                             <input type="file" ref={fileInputRef} onChange={handleDataImport} className="hidden" accept=".json" />
                             <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900 font-semibold">
                                <ArrowUpTrayIcon className="w-5 h-5" />
                                <span>Đăng nhập (Khôi phục tiến độ)</span>
                            </button>
                        </>
                    )}
                    <button onClick={onClose} className="px-4 py-2 rounded-lg hover:bg-slate-200 dark:hover:bg-gray-600 font-semibold">Đóng</button>
                </div>
            </div>
        </div>
    );
};