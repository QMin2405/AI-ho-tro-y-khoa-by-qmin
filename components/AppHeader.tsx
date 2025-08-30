import React, { useState, useEffect } from 'react';
import { useUserStore } from '../store/useUserStore';
import { getLevelInfo } from '../utils/helpers';
import { CpuChipIcon, FireIcon, BadgeCheckIcon, SunIcon, MoonIcon, HeartIcon, MaximizeIcon, RestoreDownIcon, CoinIcon, ShoppingCartIcon, ClipboardCheckIcon, ShoppingBagIcon, ShieldCheckIcon, BoltIcon } from './icons';
import { BADGES_DATA } from '../constants';
import { ThemeId } from '../types';

export const AppHeader = ({ 
    onToggleDark, isDarkMode, onProfileClick, onStreakClick, onXpBarClick, 
    onHomeClick, isAtHome, onShopClick, onQuestsClick, onInventoryClick
}: { 
    onToggleDark: () => void; isDarkMode: boolean; onProfileClick: () => void; 
    onStreakClick: () => void; onXpBarClick: () => void; onHomeClick: () => void; 
    isAtHome: boolean; onShopClick: () => void; onQuestsClick: () => void; onInventoryClick: () => void;
}) => {
    // Select only the specific state needed by this component
    const name = useUserStore(state => state.name);
    const xp = useUserStore(state => state.xp);
    const streak = useUserStore(state => state.streak);
    const stethoCoins = useUserStore(state => state.stethoCoins);
    const unlockedBadges = useUserStore(state => state.unlockedBadges);
    const hasClaimableQuests = useUserStore(state => state.activeQuests.some(q => !q.claimed && q.progress >= q.target));
    const activeBoosts = useUserStore(state => state.activeBoosts);
    const isStreakShieldActive = useUserStore(state => state.isStreakShieldActive);
    
    const { level, name: levelName, progress, nextLevelXP } = getLevelInfo(xp);

    const latestBadgeId = unlockedBadges.length > 0 ? unlockedBadges[unlockedBadges.length - 1] : null;
    const latestBadge = latestBadgeId ? BADGES_DATA[latestBadgeId] : null;

    const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);

    const isDoubleXpActive = activeBoosts?.DOUBLE_XP && activeBoosts.DOUBLE_XP.expiresAt > Date.now();
    const isDoubleCoinsActive = activeBoosts?.DOUBLE_COINS && activeBoosts.DOUBLE_COINS.expiresAt > Date.now();

    const handleToggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    };

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, []);


    const BadgeDisplay = () => {
        if (latestBadge && latestBadge.icon && React.isValidElement(latestBadge.icon)) {
            // Clone the icon element to apply a new class, as the original has `w-full h-full`
            return React.cloneElement(latestBadge.icon, { className: 'w-6 h-6' });
        }
        return <BadgeCheckIcon className="w-6 h-6" />;
    };

    return (
        <header className="bg-foreground/80 backdrop-blur-sm sticky top-0 z-20 shadow-md p-3 border-b border-border">
            <div className="container mx-auto flex justify-between items-center">
                <div
                    className={`flex items-center gap-3 rounded-lg -m-2 p-2 transition-colors ${!isAtHome ? 'cursor-pointer hover:bg-background/50' : ''}`}
                    onClick={!isAtHome ? onHomeClick : undefined}
                    role={!isAtHome ? "button" : undefined}
                    tabIndex={!isAtHome ? 0 : undefined}
                    onKeyDown={!isAtHome ? (e) => { if (e.key === 'Enter' || e.key === ' ') onHomeClick() } : undefined}
                    aria-label={!isAtHome ? "Trở về" : undefined}
                >
                    <div className="p-2 bg-brand-primary/10 rounded-lg">
                        <CpuChipIcon className="w-7 h-7 text-brand-primary"/>
                    </div>
                    <div className="group" style={{ pointerEvents: 'none' }}>
                        <h1 className="text-xl font-bold text-brand-primary">AI hỗ trợ Y khoa</h1>
                        <div className="text-xs text-text-secondary flex items-center gap-1.5 -mt-0.5">
                            <span>Created by</span>
                            <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-500">
                                QMin
                            </span>
                            <HeartIcon className="w-3.5 h-3.5 text-pink-500 transition-transform group-hover:animate-heartbeat" />
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                    <div className="flex-grow max-w-xs w-full">
                        <button onClick={onXpBarClick} className="w-full text-left group rounded-lg p-1 transition-colors hover:bg-background/50">
                            <div className="flex justify-between items-center mb-1">
                                <span className="font-semibold text-text-primary">{name} - Cấp {level} ({levelName})</span>
                                <span className="text-xs font-mono text-text-secondary">{xp} / {nextLevelXP} XP</span>
                            </div>
                            <div className="w-full bg-border rounded-full h-2.5">
                                <div className="bg-brand-secondary h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                            </div>
                        </button>
                    </div>
                    <div className="flex items-center gap-1">
                        {isDoubleXpActive && (
                            <div className="p-1.5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 group relative" title="x2 XP đang hoạt động">
                                <BoltIcon className="w-4 h-4 text-indigo-500" />
                            </div>
                        )}
                        {isDoubleCoinsActive && (
                            <div className="p-1.5 rounded-full bg-yellow-100 dark:bg-yellow-900/50 group relative" title="x2 Coin đang hoạt động">
                                <CoinIcon className="w-4 h-4 text-yellow-500" />
                            </div>
                        )}
                         {isStreakShieldActive && (
                            <div className="p-1.5 rounded-full bg-sky-100 dark:bg-sky-900/50 group relative" title="Khiên bảo vệ chuỗi đang hoạt động">
                                <ShieldCheckIcon className="w-4 h-4 text-sky-500" />
                            </div>
                        )}
                    </div>
                     <button onClick={onShopClick} className={`flex items-center gap-1 font-bold p-2 rounded-lg hover:bg-background transition-colors text-yellow-500`}>
                        <CoinIcon className="w-5 h-5" />
                        <span>{stethoCoins}</span>
                    </button>
                     <button onClick={onStreakClick} className={`flex items-center gap-1 font-bold p-2 rounded-lg hover:bg-background transition-colors ${streak > 0 ? 'text-orange-500' : 'text-text-secondary'}`}>
                        <FireIcon className="w-5 h-5" />
                        <span>{streak}</span>
                    </button>
                     <button onClick={onQuestsClick} className="relative p-2 rounded-full hover:bg-background transition-colors">
                        <ClipboardCheckIcon className="w-6 h-6" />
                        {hasClaimableQuests && (
                            <span className="absolute top-1 right-1 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-foreground"></span>
                        )}
                    </button>
                     <button onClick={onInventoryClick} className="relative p-2 rounded-full hover:bg-background transition-colors">
                        <ShoppingBagIcon className="w-6 h-6" />
                    </button>
                    <button onClick={onProfileClick} className="p-2 rounded-full hover:bg-background transition-colors relative group">
                        <BadgeDisplay />
                        {latestBadge && (
                             <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-max max-w-xs bg-gray-900 text-white text-xs rounded py-1.5 px-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap">
                                Huy hiệu gần nhất: <span className="font-bold">{latestBadge.name}</span>
                            </div>
                        )}
                    </button>
                    <button onClick={onToggleDark} className="p-2 rounded-full hover:bg-background transition-colors">
                        {isDarkMode ? <SunIcon className="w-6 h-6 text-yellow-400" /> : <MoonIcon className="w-6 h-6" />}
                    </button>
                    <button onClick={handleToggleFullscreen} className="p-2 rounded-full hover:bg-background transition-colors">
                        {isFullscreen ? <RestoreDownIcon className="w-6 h-6" /> : <MaximizeIcon className="w-6 h-6" />}
                    </button>
                </div>
            </div>
        </header>
    );
};