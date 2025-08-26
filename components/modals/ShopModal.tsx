import React from 'react';
import { useUserStore } from '../../store/useUserStore';
import { POWER_UPS_DATA } from '../../constants';
import { PowerUpId } from '../../types';
import { XIcon, CoinIcon, GiftIcon } from '../icons';

export const ShopModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void; }) => {
    const { stethoCoins, inventory, buyPowerUp, tributeClaimed, claimTribute } = useUserStore();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-30 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl transform transition-all animate-fade-in flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-200 dark:border-gray-700 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <h2 className="text-2xl font-bold">Cửa hàng Vật phẩm</h2>
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
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-gray-700"><XIcon /></button>
                    </div>
                </div>
                <div className="p-6 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {Object.entries(POWER_UPS_DATA).map(([id, powerUp]) => {
                            const powerUpId = id as PowerUpId;
                            const hasEnoughCoins = stethoCoins >= powerUp.price;
                            const ownedCount = inventory[powerUpId] || 0;

                            return (
                                <div key={id} className="bg-slate-50 dark:bg-gray-700/50 rounded-lg p-4 flex items-center gap-4">
                                    <div className="p-3 bg-slate-200 dark:bg-gray-600 rounded-lg text-brand-primary">
                                        {React.cloneElement(powerUp.icon, { className: 'w-8 h-8' })}
                                    </div>
                                    <div className="flex-grow">
                                        <h3 className="font-bold text-lg">{powerUp.name}</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">{powerUp.description}</p>
                                        {ownedCount > 0 && <p className="text-xs font-semibold text-green-600 dark:text-green-400 mt-1">Đã sở hữu: {ownedCount}</p>}
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <button 
                                            onClick={() => buyPowerUp(powerUpId)}
                                            disabled={!hasEnoughCoins}
                                            className="w-full px-4 py-2 bg-brand-primary text-white rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-blue-700 disabled:bg-slate-400 dark:disabled:bg-gray-500 disabled:cursor-not-allowed"
                                        >
                                            <CoinIcon className="w-5 h-5"/>
                                            <span>{powerUp.price}</span>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};