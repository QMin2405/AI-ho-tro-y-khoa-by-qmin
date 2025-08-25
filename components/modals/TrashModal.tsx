import React from 'react';
import { StudyPack, Folder } from '../../types';
import { useUserStore } from '../../store/useUserStore';
import { XIcon, TrashIcon, ArrowUturnLeftIcon, BookOpenIcon, FolderIcon, ICON_MAP } from '../icons';

export const TrashModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void; }) => {
    const { 
        studyPacks, 
        folders, 
        restoreItem, 
        requestPermanentDelete, 
        restoreAll, 
        requestPermanentDeleteAll 
    } = useUserStore();

    if (!isOpen) return null;

    const deletedFolders = folders.filter(f => f.isDeleted);
    const deletedPacks = studyPacks.filter(p => p.isDeleted);
    const deletedItems = [...deletedFolders, ...deletedPacks];

    const renderItem = (item: StudyPack | Folder, type: 'pack' | 'folder') => {
        const Icon = type === 'folder' ? (ICON_MAP[('icon' in item && item.icon) || 'default'] || FolderIcon) : BookOpenIcon;
        return (
            <div key={item.id} className="flex items-center justify-between p-3 bg-slate-100 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center gap-3 truncate">
                     <Icon className="w-6 h-6 text-slate-500 dark:text-slate-400 flex-shrink-0" />
                    <span className="font-semibold truncate">{'name' in item ? item.name : item.title}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => restoreItem(item.id, type)} className="p-2 rounded-full hover:bg-green-100 dark:hover:bg-green-900/50 text-green-600 dark:text-green-400" aria-label="Khôi phục">
                        <ArrowUturnLeftIcon className="w-5 h-5" />
                    </button>
                    <button onClick={() => requestPermanentDelete(item.id, type)} className="p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400" aria-label="Xóa vĩnh viễn">
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>
        )
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-30 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl transform transition-all animate-fade-in flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-200 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-2xl font-bold">Thùng rác</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-gray-700"><XIcon /></button>
                </div>
                <div className="p-6 overflow-y-auto">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 italic text-center">
                        Các mục trong thùng rác sẽ tự động bị xóa vĩnh viễn sau 30 ngày.
                    </p>
                    {deletedItems.length === 0 ? (
                        <div className="text-center py-12">
                            <TrashIcon className="w-12 h-12 mx-auto text-slate-400 mb-2" />
                            <p className="text-slate-500 dark:text-slate-400 font-semibold">Thùng rác trống.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {deletedFolders.length > 0 && (
                                <div>
                                    <h3 className="font-bold text-lg mb-2">Thư mục</h3>
                                    <div className="space-y-2">
                                        {deletedFolders.map(f => renderItem(f, 'folder'))}
                                    </div>
                                </div>
                            )}
                            {deletedPacks.length > 0 && (
                                <div>
                                    <h3 className="font-bold text-lg mb-2">Gói học tập</h3>
                                    <div className="space-y-2">
                                        {deletedPacks.map(p => renderItem(p, 'pack'))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                {deletedItems.length > 0 && (
                    <div className="p-6 bg-slate-50 dark:bg-gray-800/50 rounded-b-2xl flex justify-end items-center gap-4 border-t border-slate-200 dark:border-gray-700">
                        <button onClick={restoreAll} className="px-4 py-2 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-brand-primary hover:bg-blue-200 dark:hover:bg-blue-900 font-semibold">Khôi phục tất cả</button>
                        <button onClick={requestPermanentDeleteAll} className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700">Xóa vĩnh viễn</button>
                    </div>
                )}
            </div>
        </div>
    );
};