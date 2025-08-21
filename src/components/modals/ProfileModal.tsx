import React, { useMemo } from 'react';
import { useUserStore } from '../../store/useUserStore';
import { BadgeId } from '../../types';
import { BADGES_DATA } from '../../constants';
import { getLevelInfo, exportUserData } from '../../utils/helpers';
import { XIcon, UserCircleIcon, ArrowDownTrayIcon } from '../icons';

export const ProfileModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void; }) => {
    const userData = useUserStore(state => state);

    const allBadgeDetails = useMemo(() => {
        return Object.entries(BADGES_DATA).map(([id, data]) => ({
            id: id as BadgeId,
            ...data,
            isUnlocked: userData.unlockedBadges.includes(id as BadgeId),
        })).sort((a, b) => {
            if (a.isUnlocked && !b.isUnlocked) return -1;
            if (!a.isUnlocked && b.isUnlocked) return 1;
            return 0;
        });
    }, [userData.unlockedBadges]);
    
    const handleExport = () => {
        // We can't use the hook here, so we get the latest state directly from the store
        exportUserData(useUserStore.getState());
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-30 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl transform transition-all animate-fade-in flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-200 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-2xl font-bold">Hồ sơ & Huy hiệu</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-gray-700"><XIcon /></button>
                </div>
                <div className="p-6 overflow-y-auto">
                    <div className="text-center mb-6">
                        <UserCircleIcon className="w-24 h-24 mx-auto text-slate-300 dark:text-gray-600" />
                        <h3 className="text-2xl font-bold mt-2">{userData.name}</h3>
                        <p className="text-slate-500 dark:text-slate-400">{getLevelInfo(userData.xp).name} - Cấp {getLevelInfo(userData.xp).level}</p>
                    </div>
                    
                    <h4 className="text-lg font-bold mb-4">Huy hiệu ({userData.unlockedBadges.length} / {Object.keys(BADGES_DATA).length})</h4>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {allBadgeDetails.map(badge => {
                            const isUnlocked = badge.isUnlocked;
                            return (
                                <div key={badge.id} className={`flex flex-col items-center text-center p-4 bg-slate-100 dark:bg-gray-700/50 rounded-lg transition-opacity ${!isUnlocked ? 'opacity-60' : ''}`}>
                                    <div className={`w-16 h-16 p-3 rounded-full text-white mb-2 transition-all ${isUnlocked ? 'bg-gradient-to-br from-amber-300 to-amber-500' : 'bg-slate-400 dark:bg-gray-600 grayscale'}`}>
                                        {badge.icon}
                                    </div>
                                    <p className={`font-bold text-sm ${!isUnlocked ? 'text-slate-500 dark:text-slate-400' : ''}`}>{badge.name}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{badge.description}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div className="p-6 bg-slate-50 dark:bg-gray-800/50 rounded-b-2xl flex justify-end items-center gap-4 border-t border-slate-200 dark:border-gray-700">
                     <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900 font-semibold">
                        <ArrowDownTrayIcon className="w-5 h-5" />
                        <span>Xuất Dữ liệu</span>
                    </button>
                    <button onClick={onClose} className="px-4 py-2 rounded-lg hover:bg-slate-200 dark:hover:bg-gray-600 font-semibold">Đóng</button>
                </div>
            </div>
        </div>
    );
};
