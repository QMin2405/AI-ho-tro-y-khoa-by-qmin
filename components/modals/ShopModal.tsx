import React, { useState } from 'react';
import { useUserStore } from '../../store/useUserStore';
import { POWER_UPS_DATA, THEMES_DATA } from '../../constants';
import { PowerUpId, ThemeId } from '../../types';
import { XIcon, CoinIcon, GiftIcon, SparklesIcon, CheckCircleIcon } from '../icons';

const PowerUpsTab = () => {
    const { stethoCoins, inventory, buyPowerUp } = useUserStore();

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(POWER_UPS_DATA).map(([id, powerUp]) => {
                const powerUpId = id as PowerUpId;
                const hasEnoughCoins = stethoCoins >= powerUp.price;
                const ownedCount = inventory[powerUpId] || 0;

                return (
                    <div key={id} className="bg-background rounded-lg p-4 flex items-center gap-4 border border-border">
                        <div className="p-3 bg-background rounded-lg text-brand-primary">
                            {React.cloneElement(powerUp.icon, { className: 'w-8 h-8' })}
                        </div>
                        <div className="flex-grow">
                            <h3 className="font-bold text-lg">{powerUp.name}</h3>
                            <p className="text-sm text-text-secondary">{powerUp.description}</p>
                            {ownedCount > 0 && <p className="text-xs font-semibold text-green-600 dark:text-green-400 mt-1">Đã sở hữu: {ownedCount}</p>}
                        </div>
                        <div className="flex flex-col items-center">
                            <button 
                                onClick={() => buyPowerUp(powerUpId)}
                                disabled={!hasEnoughCoins}
                                className="w-full px-4 py-2 bg-brand-primary text-white rounded-lg font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:bg-slate-400 dark:disabled:bg-gray-500 disabled:cursor-not-allowed"
                            >
                                <CoinIcon className="w-5 h-5"/>
                                <span>{powerUp.price}</span>
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const ThemesTab = () => {
    const { stethoCoins, ownedThemes, activeTheme, buyTheme, setTheme } = useUserStore();

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(THEMES_DATA).map(([id, theme]) => {
                const themeId = id as ThemeId;
                const isOwned = ownedThemes?.includes(themeId);
                const isActive = activeTheme === themeId;
                const canAfford = stethoCoins >= theme.price;

                const getButton = () => {
                    if (isActive) {
                        return (
                            <button disabled className="w-full px-4 py-2 text-white rounded-lg font-semibold flex items-center justify-center gap-2 bg-green-500 cursor-default">
                                <CheckCircleIcon className="w-5 h-5"/>
                                <span>Đã trang bị</span>
                            </button>
                        );
                    }
                    if (isOwned) {
                        return (
                             <button onClick={() => setTheme(themeId)} className="w-full px-4 py-2 bg-brand-secondary text-white rounded-lg font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
                                <SparklesIcon className="w-5 h-5"/>
                                <span>Trang bị</span>
                            </button>
                        );
                    }
                    return (
                        <button 
                            onClick={() => buyTheme(themeId)}
                            disabled={!canAfford}
                            className="w-full px-4 py-2 bg-brand-primary text-white rounded-lg font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:bg-slate-400 dark:disabled:bg-gray-500 disabled:cursor-not-allowed"
                        >
                            <CoinIcon className="w-5 h-5"/>
                            <span>{theme.price}</span>
                        </button>
                    );
                };

                return (
                     <div key={id} className="bg-background rounded-lg p-4 flex flex-col gap-4 border border-border">
                        <div className="flex-grow">
                             <div className="flex items-center justify-between">
                                <h3 className="font-bold text-lg">{theme.name}</h3>
                                <div className="flex items-center gap-1.5">
                                    {theme.previewColors.map((color, i) => (
                                        <div key={i} className="w-5 h-5 rounded-full" style={{ backgroundColor: color }}></div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        {getButton()}
                    </div>
                )
            })}
        </div>
    );
}

export const ShopModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void; }) => {
    const { stethoCoins, tributeClaimed, claimTribute } = useUserStore();
    const [activeTab, setActiveTab] = useState<'items' | 'themes'>('items');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-30 flex items-center justify-center p-4">
            <div className="bg-foreground rounded-2xl shadow-2xl w-full max-w-3xl transform transition-all animate-fade-in flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-border flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <h2 className="text-2xl font-bold">Cửa hàng</h2>
                        <button
                            onClick={claimTribute}
                            disabled={tributeClaimed}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-md hover:from-purple-600 hover:to-indigo-700 transition-all disabled:from-slate-400 disabled:to-slate-500 disabled:cursor-not-allowed disabled:shadow-none relative overflow-hidden"
                        >
                            <GiftIcon className="w-5 h-5" />
                            <span>{tributeClaimed ? 'Đã nhận tri ân' : 'Tri Ân Tài Khoản'}</span>
                        </button>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 font-bold p-2 rounded-lg bg-yellow-100 dark:bg-yellow-800/50 text-yellow-600 dark:text-yellow-300">
                            <CoinIcon className="w-6 h-6" />
                            <span>{stethoCoins}</span>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-background"><XIcon /></button>
                    </div>
                </div>
                 <div className="border-b border-border px-6">
                    <nav className="flex gap-4">
                        <button 
                            onClick={() => setActiveTab('items')}
                            className={`py-3 font-semibold ${activeTab === 'items' ? 'text-brand-primary border-b-2 border-brand-primary' : 'text-text-secondary hover:text-text-primary'}`}
                        >
                            Vật phẩm
                        </button>
                        <button 
                             onClick={() => setActiveTab('themes')}
                            className={`py-3 font-semibold ${activeTab === 'themes' ? 'text-brand-primary border-b-2 border-brand-primary' : 'text-text-secondary hover:text-text-primary'}`}
                        >
                            Giao diện
                        </button>
                    </nav>
                </div>
                <div className="p-6 overflow-y-auto">
                   {activeTab === 'items' && <PowerUpsTab />}
                   {activeTab === 'themes' && <ThemesTab />}
                </div>
            </div>
        </div>
    );
};