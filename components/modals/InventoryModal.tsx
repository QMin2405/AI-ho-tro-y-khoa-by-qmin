import React, { useState, useEffect } from 'react';
import { useUserStore } from '../../store/useUserStore';
import { POWER_UPS_DATA } from '../../constants';
import { PowerUpId } from '../../types';
import { XIcon, ShoppingBagIcon, ClockIcon } from '../icons';

const formatTime = (ms: number) => {
    if (ms <= 0) return '00:00:00';
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export const InventoryModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void; }) => {
    const { inventory, activeBoosts, isStreakShieldActive, activatePowerUp } = useUserStore();
    const [currentTime, setCurrentTime] = useState(Date.now());

    useEffect(() => {
        if (!isOpen) return;
        const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
        return () => clearInterval(timer);
    }, [isOpen]);
    
    if (!isOpen) return null;

    const ownedPowerUps = Object.entries(inventory)
        .filter(([, count]) => (count || 0) > 0)
        .map(([id]) => id as PowerUpId);

    const isDoubleXpActive = activeBoosts?.DOUBLE_XP && activeBoosts.DOUBLE_XP.expiresAt > currentTime;
    const doubleXpTimeLeft = isDoubleXpActive ? activeBoosts.DOUBLE_XP.expiresAt - currentTime : 0;
    const isDoubleCoinsActive = activeBoosts?.DOUBLE_COINS && activeBoosts.DOUBLE_COINS.expiresAt > currentTime;
    const doubleCoinsTimeLeft = isDoubleCoinsActive ? activeBoosts.DOUBLE_COINS.expiresAt - currentTime : 0;

    const hasActiveEffects = isDoubleXpActive || isDoubleCoinsActive || isStreakShieldActive;
    const hasItems = ownedPowerUps.length > 0;

    return (
        <div className="fixed inset-0 bg-black/60 z-30 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl transform transition-all animate-fade-in flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-200 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-2xl font-bold flex items-center gap-3"><ShoppingBagIcon className="w-7 h-7" /> Túi đồ</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-gray-700"><XIcon /></button>
                </div>
                <div className="p-6 overflow-y-auto">
                    {!hasItems && !hasActiveEffects ? (
                        <div className="text-center py-12">
                            <ShoppingBagIcon className="w-12 h-12 mx-auto text-slate-400 mb-2" />
                            <p className="text-slate-500 dark:text-slate-400 font-semibold">Túi đồ trống.</p>
                            <p className="text-sm text-slate-400">Hãy mua vật phẩm từ cửa hàng để sử dụng.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {ownedPowerUps.map(id => {
                                const powerUp = POWER_UPS_DATA[id];
                                if (!powerUp) return null;
                                const count = inventory[id] || 0;
                                const isActivatable = id === PowerUpId.DOUBLE_XP || id === PowerUpId.DOUBLE_COINS || id === PowerUpId.STREAK_SHIELD;
                                const isActive = (id === PowerUpId.DOUBLE_XP && isDoubleXpActive) || (id === PowerUpId.DOUBLE_COINS && isDoubleCoinsActive) || (id === PowerUpId.STREAK_SHIELD && isStreakShieldActive);

                                return (
                                    <div key={id} className="bg-slate-50 dark:bg-gray-700/50 rounded-lg p-4 flex items-center gap-4">
                                        <div className="p-3 bg-slate-200 dark:bg-gray-600 rounded-lg text-brand-primary">
                                            {React.cloneElement(powerUp.icon, { className: 'w-8 h-8' })}
                                        </div>
                                        <div className="flex-grow">
                                            <h3 className="font-bold text-lg">{powerUp.name} <span className="text-sm font-normal text-slate-500 dark:text-slate-400">x{count}</span></h3>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">{powerUp.description}</p>
                                        </div>
                                        {isActivatable && (
                                            <button 
                                                onClick={() => activatePowerUp(id)}
                                                disabled={isActive}
                                                className="px-4 py-2 bg-green-500 text-white rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-green-600 disabled:bg-slate-400 dark:disabled:bg-gray-500 disabled:cursor-not-allowed min-w-[120px]"
                                            >
                                                {isActive ? 'Đang dùng' : 'Kích hoạt'}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                     {hasActiveEffects && (
                        <div className="mt-6 pt-6 border-t border-slate-200 dark:border-gray-700">
                            <h3 className="font-bold text-lg mb-2">Hiệu ứng đang hoạt động</h3>
                            <div className="space-y-2 text-sm">
                                {isDoubleXpActive && (
                                    <div className="flex items-center gap-2 p-2 rounded-md bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-200">
                                        {React.cloneElement(POWER_UPS_DATA.DOUBLE_XP.icon, {className: "w-5 h-5"})}
                                        <span>Nhân đôi XP</span>
                                        <span className="font-mono ml-auto flex items-center gap-1"><ClockIcon className="w-4 h-4"/> {formatTime(doubleXpTimeLeft)}</span>
                                    </div>
                                )}
                                {isDoubleCoinsActive && (
                                     <div className="flex items-center gap-2 p-2 rounded-md bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-200">
                                        {React.cloneElement(POWER_UPS_DATA.DOUBLE_COINS.icon, {className: "w-5 h-5"})}
                                        <span>Nhân đôi Coin</span>
                                        <span className="font-mono ml-auto flex items-center gap-1"><ClockIcon className="w-4 h-4"/> {formatTime(doubleCoinsTimeLeft)}</span>
                                    </div>
                                )}
                                 {isStreakShieldActive && (
                                    <div className="flex items-center gap-2 p-2 rounded-md bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-200">
                                        {React.cloneElement(POWER_UPS_DATA.STREAK_SHIELD.icon, {className: "w-5 h-5"})}
                                        <span>Khiên Bảo vệ Chuỗi đang hoạt động.</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};