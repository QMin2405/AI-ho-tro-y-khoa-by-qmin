import { useUserStore } from '../../store/useUserStore';
import { STREAK_MILESTONES } from '../../constants';
import { FireIcon, XIcon } from '../icons';

export const StreakModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void; }) => {
    const streak = useUserStore(state => state.streak);

    if (!isOpen) return null;

    const currentMilestoneIndex = STREAK_MILESTONES.findIndex(m => streak < m.days);
    const nextMilestone = currentMilestoneIndex !== -1 ? STREAK_MILESTONES[currentMilestoneIndex] : null;
    const prevMilestone = currentMilestoneIndex > 0 ? STREAK_MILESTONES[currentMilestoneIndex - 1] : STREAK_MILESTONES[STREAK_MILESTONES.length - 1];
    
    let progress = 100;
    if (nextMilestone) {
        const start = prevMilestone?.days || 0;
        const end = nextMilestone.days;
        progress = ((streak - start) / (end - start)) * 100;
    }

    return (
        <div className="fixed inset-0 bg-black/60 z-30 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md transform transition-all animate-fade-in flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-200 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-2xl font-bold">Chuỗi học tập</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-gray-700"><XIcon /></button>
                </div>
                <div className="p-6 overflow-y-auto">
                    <div className="text-center">
                        <FireIcon className={`w-24 h-24 mx-auto ${streak > 0 ? 'text-orange-500' : 'text-slate-300 dark:text-slate-600'}`} />
                        <p className="text-6xl font-bold my-2">{streak}</p>
                        <p className="text-slate-600 dark:text-slate-300 font-semibold text-lg">Ngày chuỗi học tập!</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Hãy tiếp tục để không bị mất nhé!</p>
                    </div>
                    {nextMilestone && (
                        <div className="mt-6">
                             <div className="flex justify-between items-center mb-1 text-sm">
                                <span className="font-semibold">Mục tiêu tiếp theo: {nextMilestone.name}</span>
                                <span className="font-mono">{streak} / {nextMilestone.days} ngày</span>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-gray-700 rounded-full h-4">
                                <div className="bg-orange-500 h-4 rounded-full" style={{ width: `${progress}%` }}></div>
                            </div>
                        </div>
                    )}
                </div>
                <div className="p-6 bg-slate-50 dark:bg-gray-800/50 rounded-b-2xl flex justify-end items-center gap-4 border-t border-slate-200 dark:border-gray-700">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg hover:bg-slate-200 dark:hover:bg-gray-600 font-semibold">Đóng</button>
                </div>
            </div>
        </div>
    );
};