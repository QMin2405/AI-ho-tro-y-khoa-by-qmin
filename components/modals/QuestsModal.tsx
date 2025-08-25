import React, { useState } from 'react';
import { useUserStore } from '../../store/useUserStore';
import { Quest, QuestType } from '../../types';
import { XIcon, BadgeCheckIcon, CoinIcon, ClipboardCheckIcon } from '../icons';

type QuestItemProps = {
    quest: Quest;
};

const QuestItem: React.FC<QuestItemProps> = ({ quest }) => {
    const claimQuestReward = useUserStore(state => state.claimQuestReward);
    const isComplete = quest.progress >= quest.target;

    return (
        <div className={`p-4 rounded-lg flex items-center gap-4 transition-all ${isComplete && !quest.claimed ? 'bg-yellow-50 dark:bg-yellow-900/30' : 'bg-slate-100 dark:bg-gray-700/50'}`}>
            <div className="flex-grow">
                <p className="font-semibold">{quest.description}</p>
                <div className="flex items-center gap-2 mt-2">
                    <div className="w-full bg-slate-200 dark:bg-gray-600 rounded-full h-2.5">
                        <div 
                            className={`h-2.5 rounded-full ${isComplete ? 'bg-green-500' : 'bg-brand-secondary'}`} 
                            style={{ width: `${Math.min(100, (quest.progress / quest.target) * 100)}%` }}
                        ></div>
                    </div>
                    <span className="text-xs font-mono text-slate-500 dark:text-slate-400">{Math.min(quest.progress, quest.target)}/{quest.target}</span>
                </div>
                <div className="flex items-center gap-4 text-sm mt-2 text-slate-600 dark:text-slate-300">
                    <span>Thưởng: <span className="font-bold">{quest.xpReward} XP</span></span>
                    <span className="flex items-center gap-1">, <CoinIcon className="w-4 h-4 text-yellow-500"/> <span className="font-bold">{quest.coinReward}</span></span>
                </div>
            </div>
            <button
                onClick={() => claimQuestReward(quest.id)}
                disabled={!isComplete || quest.claimed}
                className="px-4 py-2 rounded-lg font-semibold flex items-center gap-2 disabled:bg-slate-300 dark:disabled:bg-gray-600 disabled:text-slate-500 dark:disabled:cursor-not-allowed bg-green-500 hover:bg-green-600 text-white min-w-[140px] justify-center"
            >
                {quest.claimed ? <><BadgeCheckIcon className="w-5 h-5"/> Đã nhận</> : 'Nhận thưởng'}
            </button>
        </div>
    );
};

export const QuestsModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void; }) => {
    const activeQuests = useUserStore(state => state.activeQuests);
    const [activeTab, setActiveTab] = useState<QuestType>(QuestType.DAILY);

    if (!isOpen) return null;

    const dailyQuests = activeQuests.filter(q => q.type === QuestType.DAILY);
    const weeklyQuests = activeQuests.filter(q => q.type === QuestType.WEEKLY);

    const questsToDisplay = activeTab === QuestType.DAILY ? dailyQuests : weeklyQuests;

    return (
        <div className="fixed inset-0 bg-black/60 z-30 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl transform transition-all animate-fade-in flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-200 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-2xl font-bold">Nhiệm vụ</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-gray-700"><XIcon /></button>
                </div>
                <div className="p-6 flex flex-col overflow-y-auto">
                    <div className="flex border-b border-slate-200 dark:border-gray-700 mb-4">
                        <button 
                            onClick={() => setActiveTab(QuestType.DAILY)}
                            className={`px-4 py-2 font-semibold text-lg ${activeTab === QuestType.DAILY ? 'border-b-2 border-brand-primary text-brand-primary' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'}`}
                        >
                            Hàng ngày
                        </button>
                        <button 
                            onClick={() => setActiveTab(QuestType.WEEKLY)}
                            className={`px-4 py-2 font-semibold text-lg ${activeTab === QuestType.WEEKLY ? 'border-b-2 border-brand-primary text-brand-primary' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'}`}
                        >
                            Hàng tuần
                        </button>
                    </div>
                    
                    <div className="space-y-4">
                        {questsToDisplay.length > 0 ? (
                            questsToDisplay.map(quest => <QuestItem key={quest.id} quest={quest} />)
                        ) : (
                            <div className="text-center py-12">
                                <ClipboardCheckIcon className="w-12 h-12 mx-auto text-slate-400 mb-2" />
                                <p className="text-slate-500 dark:text-slate-400 font-semibold">Không có nhiệm vụ nào.</p>
                                 <p className="text-sm text-slate-400">Hãy quay lại vào ngày mai để nhận nhiệm vụ mới!</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};