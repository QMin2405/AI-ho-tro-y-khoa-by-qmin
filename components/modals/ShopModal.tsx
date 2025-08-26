import React, { useState, useEffect } from 'react';
import { useUserStore } from '../../store/useUserStore';
import { POWER_UPS_DATA } from '../../constants';
import { PowerUp, PowerUpId } from '../../types';
import { XIcon, CoinIcon } from '../icons';

export const ShopModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void; }) => {
    const { stethoCoins, inventory, buyPowerUp, activateCoinBoost, coinBoostExpiry } = useUserStore();
    const [activeTab, setActiveTab] = useState<'shop' | 'inventory'>('shop');

    if (!isOpen) return null;

    const inventoryItems = Object.entries(inventory)
        .map(([id, count]) => {
            const powerUpData = POWER_UPS_DATA[id as PowerUpId];
            if (!powerUpData) return null;
            return {
                ...powerUpData,
                id: id as PowerUpId,
                count,
            };
        })
        .filter((item): item is (Omit<PowerUp, 'id'> & { id: PowerUpId; count: number }) => item !== null && item.count > 0);

    const isCoinBoostActive = coinBoostExpiry && new Date(coinBoostExpiry) > new Date();

    const renderShop = () => (
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
                                aria-label={`Mua ${powerUp.name} giá ${powerUp.price}`}
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

    const renderInventory = () => (
        inventoryItems.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {inventoryItems.map(item => (
                    <div key={item.id} className="bg-slate-50 dark:bg-gray-700/50 rounded-lg p-4 flex items-center gap-4">
                        <div className="p-3 bg-slate-200 dark:bg-gray-600 rounded-lg text-brand-primary">
                            {React.cloneElement(item.icon, { className: 'w-8 h-8' })}
                        </div>
                        <div className="flex-grow">
                            <h3 className="font-bold text-lg">{item.name}</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Số lượng: <span className="font-bold">{item.count}</span></p>
                        </div>
                        {item.id === PowerUpId.COIN_BOOSTER && (
                            <button
                                onClick={activateCoinBoost}
                                disabled={isCoinBoostActive}
                                className="px-4 py-2 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 disabled:bg-slate-400 disabled:cursor-not-allowed"
                            >
                                {isCoinBoostActive ? 'Đang hoạt động' : 'Kích hoạt'}
                            </button>
                        )}
                    </div>
                ))}
            </div>
        ) : (
            <div className="text-center text-slate-500 dark:text-slate-400 py-8">
                <h3 className="font-semibold text-lg">Túi đồ của bạn trống.</h3>
                <p>Hãy mua vật phẩm trong Cửa hàng để sử dụng.</p>
            </div>
        )
    );

    return (
        <div className="fixed inset-0 bg-black/60 z-30 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl transform transition-all animate-fade-in flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-200 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-2xl font-bold">Cửa hàng Vật phẩm</h2>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 font-bold p-2 rounded-lg bg-yellow-100 dark:bg-yellow-800/50 text-yellow-600 dark:text-yellow-300">
                            <CoinIcon className="w-6 h-6" />
                            <span>{stethoCoins}</span>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-gray-700"><XIcon /></button>
                    </div>
                </div>
                <div className="p-6 flex flex-col overflow-y-auto">
                    <div className="flex border-b border-slate-200 dark:border-gray-700 mb-6">
                        <button 
                            onClick={() => setActiveTab('shop')}
                            className={`px-4 py-2 font-semibold text-lg ${activeTab === 'shop' ? 'border-b-2 border-brand-primary text-brand-primary' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'}`}
                        >
                            Cửa hàng
                        </button>
                        <button 
                            onClick={() => setActiveTab('inventory')}
                            className={`px-4 py-2 font-semibold text-lg ${activeTab === 'inventory' ? 'border-b-2 border-brand-primary text-brand-primary' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'}`}
                        >
                            Túi đồ ({inventoryItems.reduce((acc, item) => acc + (item.count || 0), 0)})
                        </button>
                    </div>
                    {activeTab === 'shop' ? renderShop() : renderInventory()}
                </div>
            </div>
        </div>
    );
};