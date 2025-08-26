import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserData, StudyPack, BadgeId, QuizDifficulty, Folder, ChatMessage, QuizSession, LearningMode, SubmittedAnswer, PowerUpId, Quest, QuestType, QuestCategory } from '../types';
import { BADGES_DATA, XP_ACTIONS, COIN_ACTIONS, QUIZ_DIFFICULTY_POINTS, QUIZ_COMBO_BONUS, HOT_STREAK_THRESHOLD, INQUISITIVE_MIND_THRESHOLD, CONTENT_CURATOR_THRESHOLD, ARCHITECT_THRESHOLD, KNOWLEDGE_LIBRARY_THRESHOLD, INNOVATOR_THRESHOLD, AI_PARTNER_THRESHOLD, LIVING_LEGEND_THRESHOLD, XP_EARNER_1_THRESHOLD, STEEL_BRAIN_THRESHOLD, CONQUEROR_THRESHOLD, PACK_COLORS, POWER_UPS_DATA, QUEST_TEMPLATES } from '../constants';
import { createStudyPack as createStudyPackService, askTutor, generateMoreQuestions as generateMoreQuestionsService } from '../services/geminiService';
import { useUIStore } from './useUIStore';
import { exportUserData, getLevelInfo } from '../utils/helpers';
import { ICON_MAP } from '../components/icons';

const LOCAL_STORAGE_KEY = 'smartMedTutorUserData';
const DEFAULT_USER_NAME = "Học viên Y khoa";

const initialUserData: UserData = {
    name: DEFAULT_USER_NAME,
    level: 1,
    xp: 0,
    stethoCoins: 500, // Start with some coins to use the shop
    streak: 0,
    unlockedBadges: [],
    studyPacks: [],
    folders: [],
    correctlyAnsweredQuizIds: [],
    lastActivityDate: new Date(0).toISOString(),
    questionsAskedCount: 0,
    generatedQuestionCount: 0,
    totalCorrectAnswers: 0,
    perfectQuizCompletions: 0,
    inventory: {},
    activeQuests: [],
    lastQuestRefresh: {
        daily: new Date(0).toISOString().split('T')[0],
        weekly: new Date(0).toISOString().split('T')[0],
    },
    tutorXpGainsToday: { count: 0, date: new Date(0).toISOString().split('T')[0], limitNotified: false },
    boostedPackIds: [],
    coinBoostExpiry: null,
};

// Define the state shape
interface UserState extends UserData {
    isLoggedIn: boolean;
    isGenerating: boolean;
    tutorState: 'closed' | 'open' | 'minimized' | 'maximized';
    tutorMessages: ChatMessage[];
    isTutorLoading: boolean;
    tutorContext?: string;
}

// Define the actions
interface UserActions {
    setUserData: (data: UserData) => void;
    importUserData: (file: File) => void;
    logout: () => void;
    changeName: (newName: string) => void;
    addXp: (amount: number, customMessage?: string, packId?: string) => void;
    addStethoCoins: (amount: number, customMessage?: string) => void;
    checkAndAwardBadges: () => void;
    checkDailyStreak: () => void;
    handleActivity: () => void;
    createStudyPack: (source: { text?: string; file?: File | null }) => Promise<boolean>;
    updateStudyPack: (updatedPack: StudyPack) => void;
    recordLearningModeUsage: (packId: string, mode: LearningMode) => void;
    // Standard Quiz Actions
    handleQuizAnswer: (packId: string, questionId: string, selectedAnswers: string[]) => void;
    handleQuizComplete: (pack: StudyPack, session: QuizSession) => void;
    // M2 Staatexam Quiz Actions
    handleM2StaatexamQuizAnswer: (packId: string, questionId: string, selectedAnswers: string[]) => void;
    handleM2StaatexamQuizComplete: (pack: StudyPack, session: QuizSession) => void;

    generateMoreQuestions: (packId: string, isM2Style: boolean) => Promise<void>;
    // Tutor Actions
    openTutor: (greeting?: string) => void;
    closeTutor: () => void;
    minimizeTutor: () => void;
    toggleTutorSize: () => void;
    sendMessageToTutor: (message: string) => void;
    setTutorContextAndOpen: (context: string, greeting?: string) => void;
    clearTutorContext: () => void;
    // Folder & Pack Management
    createFolder: (parentId: string | null) => void;
    updateFolder: (id: string, newName: string, newIcon: string | undefined) => void;
    movePacksToFolder: (packIds: string[], folderId: string | null) => void;
    requestSoftDelete: (id: string, type: 'pack' | 'folder') => void;
    softDeleteItem: (id: string, type: 'pack' | 'folder') => void;
    restoreItem: (id: string, type: 'pack' | 'folder') => void;
    requestPermanentDelete: (id: string, type: 'pack' | 'folder') => void;
    permanentDeleteItem: (id: string, type: 'pack' | 'folder') => void;
    restoreAll: () => void;
    requestPermanentDeleteAll: () => void;
    permanentDeleteAll: () => void;
    autoCleanupTrash: () => void;
    // Shop & Power-ups
    buyPowerUp: (powerUpId: PowerUpId) => void;
    usePowerUp: (powerUpId: PowerUpId) => void;
    activateXpBoost: (packId: string) => void;
    activateCoinBoost: () => void;
    // Quests
    refreshQuests: () => void;
    claimQuestReward: (questId: string) => void;
    updateQuestProgress: (category: QuestCategory, value: number) => void;
}

const getDescendantIds = (folderId: string, allFolders: Folder[], allPacks: StudyPack[]) => {
    let descendantFolderIds: string[] = [];
    const findChildren = (parentId: string) => {
        const children = allFolders.filter(f => f.parentId === parentId);
        for (const child of children) {
            // We need to include all descendants, even deleted ones, for restore/delete logic
            descendantFolderIds.push(child.id);
            findChildren(child.id);
        }
    };
    findChildren(folderId);
    const allFolderIds = [folderId, ...descendantFolderIds];
    const packsInDescendants = allPacks.filter(p => allFolderIds.includes(p.folderId || '')).map(p => p.id);
    return { folderIds: descendantFolderIds, packIds: packsInDescendants };
};


export const useUserStore = create<UserState & UserActions>()(
    persist(
        (set, get) => ({
            ...initialUserData,
            isLoggedIn: false,
            isGenerating: false,
            tutorState: 'closed',
            tutorMessages: [],
            isTutorLoading: false,
            tutorContext: undefined,

            setUserData: (data) => set({ ...data, isLoggedIn: data.name !== DEFAULT_USER_NAME }),

            importUserData: (file) => {
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const importedData = JSON.parse(event.target?.result as string);
                        if (importedData.name && Array.isArray(importedData.studyPacks)) {
                            get().setUserData(importedData);
                            useUIStore.getState().showToast("Dữ liệu đã được khôi phục thành công!");
                        } else { throw new Error("Invalid data format."); }
                    } catch (error) { useUIStore.getState().showToast("Lỗi: Tệp dữ liệu không hợp lệ."); }
                };
                reader.readAsText(file);
            },

            logout: () => {
                exportUserData(get());
                set({ ...initialUserData, isLoggedIn: false });
                localStorage.removeItem(LOCAL_STORAGE_KEY); // Clear persisted storage
                useUIStore.getState().showToast("Đã đăng xuất và sao lưu dữ liệu.");
            },
            
            changeName: (newName) => {
                const finalName = newName.trim() === '' ? DEFAULT_USER_NAME : newName.trim();
                set({ name: finalName });
                if (finalName !== DEFAULT_USER_NAME) {
                    set({ isLoggedIn: true });
                } else { set({ isLoggedIn: false }); }
            },
            
            addXp: (amount, customMessage, packId) => {
                const state = get();
                let finalAmount = Math.round(amount);
                if (finalAmount <= 0) return;
            
                let xpBoostMessage = '';
                if (packId && state.boostedPackIds?.includes(packId)) {
                    finalAmount *= 2;
                    xpBoostMessage = ' (x2 Boost!)';
                }

                const oldXp = state.xp;
                const oldLevel = getLevelInfo(oldXp).level;
            
                set(s => ({ xp: s.xp + finalAmount }));
                useUIStore.getState().showToast(customMessage ? `${customMessage}${xpBoostMessage}` : `+${finalAmount} XP!${xpBoostMessage}`);
            
                const newXp = get().xp;
                const newLevel = getLevelInfo(newXp).level;
            
                if (newLevel > oldLevel) {
                    const reward = newLevel * COIN_ACTIONS.LEVEL_UP_MULTIPLIER;
                    get().addStethoCoins(reward, `🎉 Lên cấp! +${reward} Stetho Coins`);
                }
                get().updateQuestProgress(QuestCategory.EARN_XP, finalAmount);
            },
            
            addStethoCoins: (amount, customMessage) => {
                let finalAmount = Math.round(amount);
                const state = get();
                const now = new Date();
                let boostMessage = '';

                if (state.coinBoostExpiry && new Date(state.coinBoostExpiry) > now) {
                    finalAmount *= 2;
                    boostMessage = ' (x2 Boost!)';
                }

                if (finalAmount > 0) {
                    set(s => ({ stethoCoins: s.stethoCoins + finalAmount }));
                    useUIStore.getState().showToast(customMessage ? `${customMessage}${boostMessage}` : `🪙 +${finalAmount} Stetho Coins!${boostMessage}`);
                }
            },
            
            checkAndAwardBadges: () => {
                const state = get();
                const newlyUnlocked: BadgeId[] = [];
                const hasBadge = (id: BadgeId) => state.unlockedBadges.includes(id);

                if (!hasBadge(BadgeId.FIRST_PACK) && state.studyPacks.length > 0) newlyUnlocked.push(BadgeId.FIRST_PACK);
                if (!hasBadge(BadgeId.THE_ARCHITECT) && state.studyPacks.length >= ARCHITECT_THRESHOLD) newlyUnlocked.push(BadgeId.THE_ARCHITECT);
                if (!hasBadge(BadgeId.CONTENT_CURATOR) && state.studyPacks.length >= CONTENT_CURATOR_THRESHOLD) newlyUnlocked.push(BadgeId.CONTENT_CURATOR);
                if (!hasBadge(BadgeId.KNOWLEDGE_LIBRARY) && state.studyPacks.length >= KNOWLEDGE_LIBRARY_THRESHOLD) newlyUnlocked.push(BadgeId.KNOWLEDGE_LIBRARY);
                if (!hasBadge(BadgeId.INQUISITIVE_MIND) && state.questionsAskedCount >= INQUISITIVE_MIND_THRESHOLD) newlyUnlocked.push(BadgeId.INQUISITIVE_MIND);
                if (!hasBadge(BadgeId.AI_PARTNER) && state.questionsAskedCount >= AI_PARTNER_THRESHOLD) newlyUnlocked.push(BadgeId.AI_PARTNER);
                if (!hasBadge(BadgeId.THE_INNOVATOR) && state.generatedQuestionCount >= INNOVATOR_THRESHOLD) newlyUnlocked.push(BadgeId.THE_INNOVATOR);
                if (!hasBadge(BadgeId.LEVEL_5_REACHED) && state.level >= 5) newlyUnlocked.push(BadgeId.LEVEL_5_REACHED);
                if (!hasBadge(BadgeId.LEVEL_10_REACHED) && state.level >= 10) newlyUnlocked.push(BadgeId.LEVEL_10_REACHED);
                if (!hasBadge(BadgeId.THE_MASTER) && state.level >= 15) newlyUnlocked.push(BadgeId.THE_MASTER);
                if (!hasBadge(BadgeId.XP_EARNER_1) && state.xp >= XP_EARNER_1_THRESHOLD) newlyUnlocked.push(BadgeId.XP_EARNER_1);
                if (!hasBadge(BadgeId.LIVING_LEGEND) && state.xp >= LIVING_LEGEND_THRESHOLD) newlyUnlocked.push(BadgeId.LIVING_LEGEND);
                if (!hasBadge(BadgeId.PERFECT_WEEK) && state.streak >= 7) newlyUnlocked.push(BadgeId.PERFECT_WEEK);
                if (!hasBadge(BadgeId.STREAK_30_DAYS) && state.streak >= 30) newlyUnlocked.push(BadgeId.STREAK_30_DAYS);
                if (!hasBadge(BadgeId.STEEL_BRAIN) && state.totalCorrectAnswers >= STEEL_BRAIN_THRESHOLD) newlyUnlocked.push(BadgeId.STEEL_BRAIN);
                if (!hasBadge(BadgeId.THE_CONQUEROR) && state.perfectQuizCompletions >= CONQUEROR_THRESHOLD) newlyUnlocked.push(BadgeId.THE_CONQUEROR);

                // HOLISTIC_LEARNER
                if (!hasBadge(BadgeId.HOLISTIC_LEARNER)) {
                    const requiredModes = [LearningMode.SUMMARY, LearningMode.QUIZ, LearningMode.FILL_IN_THE_BLANK, LearningMode.GLOSSARY];
                    if (state.studyPacks.some(p => requiredModes.every(mode => (p.usedLearningModes || []).includes(mode)))) {
                        newlyUnlocked.push(BadgeId.HOLISTIC_LEARNER);
                    }
                }
                
                // SUBJECT_MATTER_EXPERT
                if (!hasBadge(BadgeId.SUBJECT_MATTER_EXPERT)) {
                    if (state.studyPacks.some(p => p.progress >= 100)) {
                        newlyUnlocked.push(BadgeId.SUBJECT_MATTER_EXPERT);
                    }
                }
                
                if (newlyUnlocked.length > 0) {
                    set(prev => ({ unlockedBadges: [...prev.unlockedBadges, ...newlyUnlocked] }));
                    newlyUnlocked.forEach(badgeId => useUIStore.getState().showToast(`🏆 Huy hiệu mới: ${BADGES_DATA[badgeId].name}!`));
                }
            },
            
            checkDailyStreak: () => {
                const today = new Date(); today.setHours(0, 0, 0, 0);
                const lastActivity = new Date(get().lastActivityDate); lastActivity.setHours(0, 0, 0, 0);
                const diffDays = Math.round((today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));

                if (diffDays > 1 && get().lastActivityDate !== new Date(0).toISOString()) {
                    const shields = get().inventory[PowerUpId.STREAK_SHIELD] || 0;
                    if (shields > 0) {
                        get().usePowerUp(PowerUpId.STREAK_SHIELD);
                        // To "save" the streak, we pretend the user was active yesterday.
                        const yesterday = new Date();
                        yesterday.setDate(yesterday.getDate() - 1);
                        set({ lastActivityDate: yesterday.toISOString() });
                        useUIStore.getState().showToast('🛡️ Khiên bảo vệ đã cứu chuỗi của bạn!');
                    } else {
                        set({ streak: 0 });
                    }
                }
            },
            
            handleActivity: () => {
                const today = new Date(); today.setHours(0, 0, 0, 0);
                const lastActivity = new Date(get().lastActivityDate); lastActivity.setHours(0, 0, 0, 0);
                const diffDays = Math.round((today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
                let newStreakValue = get().streak;
                
                if (diffDays === 1) {
                    newStreakValue = get().streak + 1;
                    set({ streak: newStreakValue, lastActivityDate: new Date().toISOString() });
                    get().addStethoCoins(COIN_ACTIONS.STREAK_DAILY);
                    if (newStreakValue >= 2) {
                        get().addXp(XP_ACTIONS.STREAK_BONUS, `🔥 Chuỗi ${newStreakValue} ngày! +${XP_ACTIONS.STREAK_BONUS} XP`);
                    } else {
                        useUIStore.getState().showToast(`🔥 Chuỗi ${newStreakValue} ngày!`);
                    }
                } else if (diffDays > 1) {
                    newStreakValue = 1;
                    set({ streak: newStreakValue, lastActivityDate: new Date().toISOString() });
                    useUIStore.getState().showToast(`Bắt đầu chuỗi mới!`);
                    get().addStethoCoins(COIN_ACTIONS.STREAK_DAILY);
                } else { 
                    const isFirstEver = get().lastActivityDate === new Date(0).toISOString();
                    if (isFirstEver) {
                        newStreakValue = 1;
                        set({ streak: newStreakValue, lastActivityDate: new Date().toISOString() });
                        useUIStore.getState().showToast(`🔥 Bắt đầu chuỗi mới!`);
                        get().addStethoCoins(COIN_ACTIONS.STREAK_DAILY);
                    } else {
                        set({ lastActivityDate: new Date().toISOString() });
                    }
                }
                get().updateQuestProgress(QuestCategory.MAINTAIN_STREAK, newStreakValue);

                const currentHour = new Date().getHours();
                if (currentHour >= 22 && !get().unlockedBadges.includes(BadgeId.NIGHT_OWL)) {
                    set(prev => ({ unlockedBadges: [...prev.unlockedBadges, BadgeId.NIGHT_OWL] }));
                    useUIStore.getState().showToast(`🏆 Huy hiệu mới: ${BADGES_DATA[BadgeId.NIGHT_OWL].name}!`);
                }
                if (currentHour < 7 && !get().unlockedBadges.includes(BadgeId.EARLY_BIRD)) {
                     set(prev => ({ unlockedBadges: [...prev.unlockedBadges, BadgeId.EARLY_BIRD] }));
                     useUIStore.getState().showToast(`🏆 Huy hiệu mới: ${BADGES_DATA[BadgeId.EARLY_BIRD].name}!`);
                }
            },

            createStudyPack: async (source) => {
                set({ isGenerating: true });
                const { addXp, handleActivity, updateQuestProgress } = get();
                try {
                    let serviceSource: { text?: string; file?: { data: string, mimeType: string } } = {};
                    if (source.file) {
                        const base64Data = await new Promise<string>((resolve, reject) => {
                            const reader = new FileReader();
                            reader.readAsDataURL(source.file!);
                            reader.onload = () => resolve((reader.result as string).split(',')[1]);
                            reader.onerror = error => reject(error);
                        });
                        serviceSource.file = { data: base64Data, mimeType: source.file.type };
                        if (source.text?.trim()) serviceSource.text = source.text.trim();
                    } else { serviceSource.text = source.text?.trim(); }
                    
                    const packId = `pack_${Date.now()}`;
                    const generatedContent = await createStudyPackService(serviceSource);

                    const randomColor = PACK_COLORS[Math.floor(Math.random() * PACK_COLORS.length)].key;
                    const availableIcons = Object.keys(ICON_MAP).filter(key => key !== 'default');
                    const randomIcon = availableIcons[Math.floor(Math.random() * availableIcons.length)];

                    const newPack: StudyPack = {
                        id: packId, imageUrl: '📚', progress: 0, ...generatedContent,
                        title: generatedContent.title || "Gói không tên", lesson: generatedContent.lesson || [],
                        quiz: (generatedContent.quiz || []).map((q, i) => ({ ...q, uniqueId: `${packId}_q_${i}` })),
                        m2StaatexamQuiz: (generatedContent.m2StaatexamQuiz || []).map((q, i) => ({ ...q, uniqueId: `${packId}_m2_${i}` })),
                        originalQuizCount: (generatedContent.quiz || []).length,
                        fillInTheBlanks: generatedContent.fillInTheBlanks || [], glossary: generatedContent.glossary || [], folderId: null,
                        color: randomColor,
                        icon: randomIcon,
                        hasBeenCustomized: false,
                    };
                    set(state => ({ studyPacks: [...state.studyPacks, newPack] }));
                    addXp(XP_ACTIONS.CREATE_PACK, `+${XP_ACTIONS.CREATE_PACK} XP khi tạo gói mới!`);
                    handleActivity();
                    updateQuestProgress(QuestCategory.CREATE_PACK, 1);
                    return true;
                } catch (err) {
                    console.error(err);
                    return false;
                } finally { set({ isGenerating: false }); }
            },

            recordLearningModeUsage: (packId, mode) => {
                set(state => {
                    const pack = state.studyPacks.find(p => p.id === packId);
                    if (!pack) return state;

                    const currentModes = pack.usedLearningModes || [];
                    if (!currentModes.includes(mode)) {
                        const updatedPack = { ...pack, usedLearningModes: [...currentModes, mode] };
                        return { studyPacks: state.studyPacks.map(p => p.id === packId ? updatedPack : p) };
                    }
                    return state;
                });
                get().checkAndAwardBadges();
            },

            updateStudyPack: (updatedPack) => {
                const oldPack = get().studyPacks.find(p => p.id === updatedPack.id);
            
                if (oldPack) {
                    const hasBeenTrulyCustomized = (oldPack.title !== updatedPack.title || oldPack.color !== updatedPack.color || oldPack.icon !== updatedPack.icon);
            
                    if (hasBeenTrulyCustomized) {
                        if (!oldPack.hasBeenCustomized) {
                            get().addXp(XP_ACTIONS.PERSONAL_TOUCH, `+${XP_ACTIONS.PERSONAL_TOUCH} XP cho Dấu ấn cá nhân!`);
                            updatedPack.hasBeenCustomized = true; 
                        }
            
                        if (!get().unlockedBadges.includes(BadgeId.PERSONAL_TOUCH)) {
                            set(prev => ({ unlockedBadges: [...prev.unlockedBadges, BadgeId.PERSONAL_TOUCH] }));
                            useUIStore.getState().showToast(`🏆 Huy hiệu mới: ${BADGES_DATA[BadgeId.PERSONAL_TOUCH].name}!`);
                        }
                    }
                }
                
                set(state => ({ 
                    studyPacks: state.studyPacks.map(p => p.id === updatedPack.id ? updatedPack : p) 
                }));
            },
            
            handleQuizAnswer: (packId, questionId, selectedAnswers) => {
                const state = get();
                const pack = state.studyPacks.find(p => p.id === packId);
                const question = pack?.quiz.find(q => q.uniqueId === questionId);
        
                if (!pack || !question) {
                    console.error("Pack or question not found in handleQuizAnswer");
                    return;
                }
        
                const session = pack.quizSession || {
                    currentQuestionIndex: 0, comboCount: 0, submittedAnswers: {},
                    incorrectlyAnsweredIds: [], activeQuestionIds: pack.quiz.map(q => q.uniqueId),
                };
        
                const isCorrect = question.correctAnswers.length === selectedAnswers.length &&
                                  question.correctAnswers.every(ans => selectedAnswers.includes(ans));
                const newComboCount = isCorrect ? session.comboCount + 1 : 0;
                
                if (isCorrect && !state.correctlyAnsweredQuizIds.includes(questionId)) {
                    let xpGained = 0;
                    let toastMessage: string | null = null;
                    
                    let baseAmount = XP_ACTIONS.QUIZ_CORRECT_ANSWER + (QUIZ_DIFFICULTY_POINTS[question.difficulty as QuizDifficulty] || 0);
                    if (newComboCount > 1) {
                        baseAmount += QUIZ_COMBO_BONUS * (newComboCount - 1);
                    }
                    const streakMultiplier = state.streak > 1 ? 1 + (state.streak - 1) * 0.2 : 1;
                    xpGained = Math.round(baseAmount * streakMultiplier);
        
                    toastMessage = streakMultiplier > 1
                        ? `+${xpGained} XP! (Thưởng chuỗi x${streakMultiplier.toFixed(1)})`
                        : `+${xpGained} XP!`;
                    
                    get().addXp(xpGained, toastMessage, packId);
                    get().updateQuestProgress(QuestCategory.ANSWER_CORRECTLY, 1);

                    let coinsGained = 0;
                    switch (question.difficulty) {
                        case QuizDifficulty.EASY: coinsGained = COIN_ACTIONS.QUIZ_CORRECT_EASY; break;
                        case QuizDifficulty.MEDIUM: coinsGained = COIN_ACTIONS.QUIZ_CORRECT_MEDIUM; break;
                        case QuizDifficulty.HARD: coinsGained = COIN_ACTIONS.QUIZ_CORRECT_HARD; break;
                    }
                    get().addStethoCoins(coinsGained);
                }
        
                set(prev => {
                    const newSubmittedAnswers: Record<string, SubmittedAnswer> = {
                        ...session.submittedAnswers,
                        [questionId]: { selectedAnswers, isCorrect }
                    };
                    const newIncorrectlyAnsweredIds = !isCorrect && !session.incorrectlyAnsweredIds.includes(questionId)
                        ? [...session.incorrectlyAnsweredIds, questionId]
                        : session.incorrectlyAnsweredIds.filter(id => !(id === questionId && isCorrect));
                    
                    const newSession: QuizSession = {
                        ...session,
                        comboCount: newComboCount,
                        submittedAnswers: newSubmittedAnswers,
                        incorrectlyAnsweredIds: newIncorrectlyAnsweredIds,
                    };
        
                    const newCorrectlyAnsweredIds = (isCorrect && !prev.correctlyAnsweredQuizIds.includes(questionId))
                        ? [...prev.correctlyAnsweredQuizIds, questionId]
                        : prev.correctlyAnsweredQuizIds;
                    
                    const newTotalCorrectAnswers = (isCorrect && !prev.correctlyAnsweredQuizIds.includes(questionId))
                        ? prev.totalCorrectAnswers + 1
                        : prev.totalCorrectAnswers;
        
                    const totalCorrectForPack = newCorrectlyAnsweredIds.filter(id => id.startsWith(packId)).length;
                    const totalQuestions = pack.originalQuizCount || pack.quiz.length;
                    const newProgress = totalQuestions > 0 ? Math.min(100, Math.round((totalCorrectForPack / totalQuestions) * 100)) : 0;
                    
                    if (newProgress >= 100 && (pack.progress || 0) < 100) {
                        get().addStethoCoins(COIN_ACTIONS.PACK_COMPLETE, `Hoàn thành Gói! +${COIN_ACTIONS.PACK_COMPLETE} Stetho Coins`);
                    }

                    const updatedPacks = prev.studyPacks.map(p => {
                        if (p.id === packId) {
                            return { ...p, quizSession: newSession, progress: newProgress };
                        }
                        return p;
                    });
                    
                    return {
                        correctlyAnsweredQuizIds: newCorrectlyAnsweredIds,
                        totalCorrectAnswers: newTotalCorrectAnswers,
                        studyPacks: updatedPacks
                    };
                });
                
                if (isCorrect && newComboCount >= HOT_STREAK_THRESHOLD && !get().unlockedBadges.includes(BadgeId.HOT_STREAK)) {
                    set(prev => ({ unlockedBadges: [...prev.unlockedBadges, BadgeId.HOT_STREAK] }));
                }
            },
            
            handleQuizComplete: (pack, session) => {
                const originalQuestionsCount = pack.originalQuizCount || pack.quiz.length;
                if (session.activeQuestionIds.length >= originalQuestionsCount) get().handleActivity();

                const score = Object.values(session.submittedAnswers).filter((a: SubmittedAnswer) => a.isCorrect).length;
                const isPerfect = score === session.activeQuestionIds.length && session.activeQuestionIds.length > 0;
                
                get().updateQuestProgress(QuestCategory.COMPLETE_QUIZ, 1);
                if (isPerfect) {
                    set(prev => ({ perfectQuizCompletions: prev.perfectQuizCompletions + 1 }));

                    if (!get().unlockedBadges.includes(BadgeId.FLAWLESS_VICTORY)) {
                        const questionsInSession = pack.quiz.filter(q => session.activeQuestionIds.includes(q.uniqueId));
                        const hasHardQuestion = questionsInSession.some(q => q.difficulty === QuizDifficulty.HARD);
                        if (hasHardQuestion) {
                            set(prev => ({ unlockedBadges: [...prev.unlockedBadges, BadgeId.FLAWLESS_VICTORY] }));
                            useUIStore.getState().showToast(`🏆 Huy hiệu mới: ${BADGES_DATA[BadgeId.FLAWLESS_VICTORY].name}!`);
                        }
                    }
                }
                
                if (!get().unlockedBadges.includes(BadgeId.FIRST_QUIZ)) {
                    set(prev => ({ unlockedBadges: [...prev.unlockedBadges, BadgeId.FIRST_QUIZ] }));
                    useUIStore.getState().showToast(`🏆 Huy hiệu mới: ${BADGES_DATA[BadgeId.FIRST_QUIZ].name}!`);
                }
                get().checkAndAwardBadges();
            },

            handleM2StaatexamQuizAnswer: (packId, questionId, selectedAnswers) => {
                const state = get();
                const pack = state.studyPacks.find(p => p.id === packId);
                const question = pack?.m2StaatexamQuiz?.find(q => q.uniqueId === questionId);
        
                if (!pack || !question || !pack.m2StaatexamQuiz) return;
        
                const session = pack.m2StaatexamQuizSession || {
                    currentQuestionIndex: 0, comboCount: 0, submittedAnswers: {},
                    incorrectlyAnsweredIds: [], activeQuestionIds: pack.m2StaatexamQuiz.map(q => q.uniqueId),
                };
        
                const isCorrect = question.correctAnswers.length === selectedAnswers.length &&
                                  question.correctAnswers.every(ans => selectedAnswers.includes(ans));
                const newComboCount = isCorrect ? session.comboCount + 1 : 0;
                
                if (isCorrect && !state.correctlyAnsweredQuizIds.includes(questionId)) {
                    let xpGained = 0;
                    let toastMessage: string | null = null;
                    let baseAmount = XP_ACTIONS.QUIZ_CORRECT_ANSWER + (QUIZ_DIFFICULTY_POINTS[question.difficulty as QuizDifficulty] || 0);
                    if (newComboCount > 1) baseAmount += QUIZ_COMBO_BONUS * (newComboCount - 1);
                    const streakMultiplier = state.streak > 1 ? 1 + (state.streak - 1) * 0.2 : 1;
                    xpGained = Math.round(baseAmount * streakMultiplier);
                    
                    toastMessage = streakMultiplier > 1 ? `+${xpGained} XP! (Thưởng chuỗi x${streakMultiplier.toFixed(1)})` : `+${xpGained} XP!`;

                    get().addXp(xpGained, toastMessage, packId);
                    get().updateQuestProgress(QuestCategory.ANSWER_CORRECTLY, 1);

                    let coinsGained = 0;
                    switch (question.difficulty) {
                        case QuizDifficulty.EASY: coinsGained = COIN_ACTIONS.QUIZ_CORRECT_EASY; break;
                        case QuizDifficulty.MEDIUM: coinsGained = COIN_ACTIONS.QUIZ_CORRECT_MEDIUM; break;
                        case QuizDifficulty.HARD: coinsGained = COIN_ACTIONS.QUIZ_CORRECT_HARD; break;
                    }
                    get().addStethoCoins(coinsGained);
                }
        
                set(prev => {
                    const newSubmittedAnswers: Record<string, SubmittedAnswer> = {
                        ...session.submittedAnswers,
                        [questionId]: { selectedAnswers, isCorrect }
                    };
                    const newIncorrectlyAnsweredIds = !isCorrect && !session.incorrectlyAnsweredIds.includes(questionId)
                        ? [...session.incorrectlyAnsweredIds, questionId]
                        : session.incorrectlyAnsweredIds.filter(id => !(id === questionId && isCorrect));
                    
                    const newSession: QuizSession = { ...session, comboCount: newComboCount, submittedAnswers: newSubmittedAnswers, incorrectlyAnsweredIds: newIncorrectlyAnsweredIds };
                    const newCorrectlyAnsweredIds = (isCorrect && !prev.correctlyAnsweredQuizIds.includes(questionId)) ? [...prev.correctlyAnsweredQuizIds, questionId] : prev.correctlyAnsweredQuizIds;
                    const newTotalCorrectAnswers = (isCorrect && !prev.correctlyAnsweredQuizIds.includes(questionId)) ? prev.totalCorrectAnswers + 1 : prev.totalCorrectAnswers;
                    
                    const updatedPacks = prev.studyPacks.map(p => p.id === packId ? { ...p, m2StaatexamQuizSession: newSession } : p);
                    
                    return {
                        correctlyAnsweredQuizIds: newCorrectlyAnsweredIds,
                        totalCorrectAnswers: newTotalCorrectAnswers,
                        studyPacks: updatedPacks
                    };
                });
        
                if (isCorrect && newComboCount >= HOT_STREAK_THRESHOLD && !get().unlockedBadges.includes(BadgeId.HOT_STREAK)) {
                    set(prev => ({ unlockedBadges: [...prev.unlockedBadges, BadgeId.HOT_STREAK] }));
                }
            },

            handleM2StaatexamQuizComplete: (pack, session) => {
                get().handleActivity();
                const score = Object.values(session.submittedAnswers).filter((a: SubmittedAnswer) => a.isCorrect).length;
                const isPerfect = score === session.activeQuestionIds.length && session.activeQuestionIds.length > 0;
                
                get().updateQuestProgress(QuestCategory.COMPLETE_QUIZ, 1);
                if (isPerfect) {
                    set(prev => ({ perfectQuizCompletions: prev.perfectQuizCompletions + 1 }));

                    if (!get().unlockedBadges.includes(BadgeId.FLAWLESS_VICTORY)) {
                        const questionsInSession = (pack.m2StaatexamQuiz || []).filter(q => session.activeQuestionIds.includes(q.uniqueId));
                        const hasHardQuestion = questionsInSession.some(q => q.difficulty === QuizDifficulty.HARD);
                        if (hasHardQuestion) {
                            set(prev => ({ unlockedBadges: [...prev.unlockedBadges, BadgeId.FLAWLESS_VICTORY] }));
                            useUIStore.getState().showToast(`🏆 Huy hiệu mới: ${BADGES_DATA[BadgeId.FLAWLESS_VICTORY].name}!`);
                        }
                    }
                }
                
                if (!get().unlockedBadges.includes(BadgeId.FIRST_QUIZ)) {
                    set(prev => ({ unlockedBadges: [...prev.unlockedBadges, BadgeId.FIRST_QUIZ] }));
                    useUIStore.getState().showToast(`🏆 Huy hiệu mới: ${BADGES_DATA[BadgeId.FIRST_QUIZ].name}!`);
                }
                get().checkAndAwardBadges();
            },
            
            generateMoreQuestions: async (packId, isM2Style) => {
                const pack = get().studyPacks.find(p => p.id === packId);
                if (!pack) return;

                set({ isGenerating: true });
                try {
                    const context = pack.lesson.map(b => b.content).join('\n');
                    const existingQuestions = isM2Style ? (pack.m2StaatexamQuiz || []) : (pack.quiz || []);
                    const newQuestionsData = await generateMoreQuestionsService(context, existingQuestions, isM2Style);

                    if (newQuestionsData.length > 0) {
                        set(state => {
                            const packToUpdate = state.studyPacks.find(p => p.id === packId);
                            if (!packToUpdate) return state;

                            let updatedPack: StudyPack;
                            let newSession: QuizSession | undefined;

                            if (isM2Style) {
                                const baseQuiz = packToUpdate.m2StaatexamQuiz || [];
                                const newQuestions = newQuestionsData.map((q, i) => ({ ...q, uniqueId: `${packId}_m2_gen_${Date.now()}_${i}` }));
                                const updatedQuiz = [...baseQuiz, ...newQuestions];
                                newSession = { ...packToUpdate.m2StaatexamQuizSession!, activeQuestionIds: updatedQuiz.map(q => q.uniqueId) };
                                updatedPack = { ...packToUpdate, m2StaatexamQuiz: updatedQuiz, m2StaatexamQuizSession: newSession };
                            } else {
                                const baseQuiz = packToUpdate.quiz || [];
                                const newQuestions = newQuestionsData.map((q, i) => ({ ...q, uniqueId: `${packId}_q_gen_${Date.now()}_${i}` }));
                                const updatedQuiz = [...baseQuiz, ...newQuestions];
                                newSession = { ...packToUpdate.quizSession!, activeQuestionIds: updatedQuiz.map(q => q.uniqueId) };
                                updatedPack = { ...packToUpdate, quiz: updatedQuiz, quizSession: newSession };
                            }

                            get().addXp(newQuestionsData.length * 10, `+${newQuestionsData.length * 10} XP vì tạo câu hỏi mới!`);
                            set(s => ({ generatedQuestionCount: s.generatedQuestionCount + newQuestionsData.length }));

                            return {
                                studyPacks: state.studyPacks.map(p => p.id === packId ? updatedPack : p)
                            };
                        });
                    }
                } catch (error) {
                    console.error("Failed to generate more questions", error);
                } finally {
                    set({ isGenerating: false });
                }
            },
            // --- Tutor Actions ---
            openTutor: (greeting) => {
                set(state => {
                    const newMessages = state.tutorMessages.length === 0 
                        // FIX: Explicitly type the sender property to match ChatMessage['sender']
                        ? [{ sender: 'ai' as const, text: greeting || 'Chào bạn! Tôi có thể giúp gì cho bạn?' }]
                        : state.tutorMessages;
                    return { tutorState: 'open', tutorMessages: newMessages };
                });
            },
            closeTutor: () => set({ tutorState: 'closed', tutorMessages: [] }),
            minimizeTutor: () => set({ tutorState: 'minimized' }),
            toggleTutorSize: () => set(state => ({ tutorState: state.tutorState === 'maximized' ? 'open' : 'maximized' })),
            
            sendMessageToTutor: async (message) => {
                set(state => ({
                    tutorMessages: [...state.tutorMessages, { sender: 'user', text: message }],
                    isTutorLoading: true,
                }));

                const today = new Date().toISOString().split('T')[0];
                const gainsToday = get().tutorXpGainsToday?.date === today ? get().tutorXpGainsToday!.count : 0;

                if (gainsToday < 10) { // Limit XP from tutor to 10 times a day
                    get().addXp(XP_ACTIONS.ASK_AI);
                    set(state => ({ tutorXpGainsToday: { count: gainsToday + 1, date: today, limitNotified: state.tutorXpGainsToday?.limitNotified } }));
                } else {
                    const notified = get().tutorXpGainsToday?.limitNotified;
                    if (!notified) {
                        useUIStore.getState().showToast("Bạn đã đạt giới hạn XP nhận được từ Gia sư AI hôm nay.");
                        set(state => ({ tutorXpGainsToday: { ...state.tutorXpGainsToday!, limitNotified: true } }));
                    }
                }
                
                set(state => ({ questionsAskedCount: state.questionsAskedCount + 1 }));
                get().handleActivity();

                try {
                    const studyPackContext = get().studyPacks.map(p => `- ${p.title}`).join('\n');
                    const fullContext = `Bối cảnh các Gói học tập hiện tại:\n${studyPackContext}`;
                    const aiResponse = await askTutor(fullContext, message, get().tutorContext);
                    set(state => ({
                        tutorMessages: [...state.tutorMessages, { sender: 'ai', text: aiResponse }],
                        isTutorLoading: false,
                    }));
                } catch (error) {
                    set(state => ({
                        tutorMessages: [...state.tutorMessages, { sender: 'ai', text: "Xin lỗi, tôi gặp lỗi khi xử lý yêu cầu của bạn." }],
                        isTutorLoading: false,
                    }));
                }
            },

            setTutorContextAndOpen: (context, greeting) => {
                set({ tutorContext: context });
                get().openTutor(greeting);
            },
            clearTutorContext: () => set({ tutorContext: undefined }),
            
            // --- Folder & Pack Management ---
            createFolder: (parentId) => {
                const newFolder: Folder = {
                    id: `folder_${Date.now()}`,
                    name: "Thư mục mới",
                    parentId,
                };
                set(state => ({ folders: [...state.folders, newFolder] }));
            },
            
            updateFolder: (id, newName, newIcon) => {
                set(state => ({
                    folders: state.folders.map(f => f.id === id ? { ...f, name: newName, icon: newIcon } : f)
                }));
            },
            
            movePacksToFolder: (packIds, folderId) => {
                set(state => ({
                    studyPacks: state.studyPacks.map(p => packIds.includes(p.id) ? { ...p, folderId: folderId } : p)
                }));
            },
            
            requestSoftDelete: (id, type) => {
                 const onConfirm = () => get().softDeleteItem(id, type);
                 useUIStore.getState().showConfirmModal({
                     title: `Xóa ${type === 'pack' ? 'Gói học tập' : 'Thư mục'}?`,
                     text: `Mục này sẽ được chuyển vào thùng rác và xóa vĩnh viễn sau 30 ngày.`,
                     confirmText: "Chuyển vào thùng rác",
                     onConfirm,
                     // FIX: Removed `onCancel` as it's handled automatically by the UI store.
                     isDestructive: true,
                 });
            },
            
            softDeleteItem: (id, type) => {
                const deletedAt = new Date().toISOString();
                if (type === 'pack') {
                    set(state => ({
                        studyPacks: state.studyPacks.map(p => p.id === id ? { ...p, isDeleted: true, deletedAt } : p)
                    }));
                } else { // type === 'folder'
                    const { folderIds, packIds } = getDescendantIds(id, get().folders, get().studyPacks);
                    const allFolderIdsToDelete = [id, ...folderIds];
                    
                    set(state => ({
                        folders: state.folders.map(f => allFolderIdsToDelete.includes(f.id) ? { ...f, isDeleted: true, deletedAt } : f),
                        studyPacks: state.studyPacks.map(p => packIds.includes(p.id) ? { ...p, isDeleted: true, deletedAt } : p)
                    }));
                }
            },
            
            restoreItem: (id, type) => {
                if (type === 'pack') {
                    set(state => ({
                        studyPacks: state.studyPacks.map(p => p.id === id ? { ...p, isDeleted: false, deletedAt: undefined } : p)
                    }));
                } else { // type === 'folder'
                    const { folderIds, packIds } = getDescendantIds(id, get().folders, get().studyPacks);
                    const allFolderIdsToRestore = [id, ...folderIds];
                    
                    set(state => ({
                        folders: state.folders.map(f => allFolderIdsToRestore.includes(f.id) ? { ...f, isDeleted: false, deletedAt: undefined } : f),
                        studyPacks: state.studyPacks.map(p => packIds.includes(p.id) ? { ...p, isDeleted: false, deletedAt: undefined } : p)
                    }));
                }
            },
            
            requestPermanentDelete: (id, type) => {
                const onConfirm = () => get().permanentDeleteItem(id, type);
                useUIStore.getState().showConfirmModal({
                     title: `Xóa vĩnh viễn?`,
                     text: `Hành động này không thể hoàn tác. Tất cả dữ liệu liên quan sẽ bị xóa.`,
                     confirmText: "Xóa vĩnh viễn",
                     onConfirm,
                     // FIX: Removed `onCancel` as it's handled automatically by the UI store.
                     isDestructive: true,
                 });
            },
            
            permanentDeleteItem: (id, type) => {
                if (type === 'pack') {
                    set(state => ({ studyPacks: state.studyPacks.filter(p => p.id !== id) }));
                } else { // type === 'folder'
                    const { folderIds, packIds } = getDescendantIds(id, get().folders, get().studyPacks);
                    const allFolderIdsToDelete = [id, ...folderIds];
                    
                    set(state => ({
                        folders: state.folders.filter(f => !allFolderIdsToDelete.includes(f.id)),
                        studyPacks: state.studyPacks.filter(p => !packIds.includes(p.id))
                    }));
                }
            },
            
            restoreAll: () => {
                set(state => ({
                    studyPacks: state.studyPacks.map(p => p.isDeleted ? { ...p, isDeleted: false, deletedAt: undefined } : p),
                    folders: state.folders.map(f => f.isDeleted ? { ...f, isDeleted: false, deletedAt: undefined } : f),
                }));
            },
            
            requestPermanentDeleteAll: () => {
                 useUIStore.getState().showConfirmModal({
                     title: "Dọn sạch Thùng rác?",
                     text: "Tất cả các mục trong thùng rác sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác.",
                     confirmText: "Xóa tất cả",
                     onConfirm: () => get().permanentDeleteAll(),
                     // FIX: Removed `onCancel` as it's handled automatically by the UI store.
                     isDestructive: true,
                 });
            },
            
            permanentDeleteAll: () => {
                set(state => ({
                    studyPacks: state.studyPacks.filter(p => !p.isDeleted),
                    folders: state.folders.filter(f => !f.isDeleted),
                }));
            },
            
            autoCleanupTrash: () => {
                const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
                set(state => ({
                    studyPacks: state.studyPacks.filter(p => !p.isDeleted || (p.deletedAt && p.deletedAt > thirtyDaysAgo)),
                    folders: state.folders.filter(f => !f.isDeleted || (f.deletedAt && f.deletedAt > thirtyDaysAgo)),
                }));
            },

            // --- Shop & Power-ups ---
            buyPowerUp: (powerUpId) => {
                const powerUpData = POWER_UPS_DATA[powerUpId];
                if (!powerUpData) return;

                const state = get();
                if (state.stethoCoins >= powerUpData.price) {
                    set(s => ({
                        stethoCoins: s.stethoCoins - powerUpData.price,
                        inventory: {
                            ...s.inventory,
                            [powerUpId]: (s.inventory[powerUpId] || 0) + 1,
                        }
                    }));
                    useUIStore.getState().showToast(`Đã mua: ${powerUpData.name}!`);
                } else {
                    useUIStore.getState().showToast('Không đủ Stetho Coins!');
                }
            },
            
            usePowerUp: (powerUpId) => {
                const currentCount = get().inventory[powerUpId] || 0;
                if (currentCount > 0) {
                    set(s => ({
                        inventory: {
                            ...s.inventory,
                            [powerUpId]: currentCount - 1,
                        }
                    }));
                } else {
                    console.warn(`Attempted to use power-up ${powerUpId} with 0 count.`);
                }
            },

            activateXpBoost: (packId) => {
                const state = get();
                const xpBoosterCount = state.inventory[PowerUpId.XP_BOOSTER] || 0;
                const isAlreadyBoosted = state.boostedPackIds?.includes(packId);

                if (isAlreadyBoosted) {
                     useUIStore.getState().showToast('Gói học tập này đã được tăng cường XP.');
                     return;
                }

                if (xpBoosterCount > 0) {
                    get().usePowerUp(PowerUpId.XP_BOOSTER);
                    set(s => ({
                        boostedPackIds: [...(s.boostedPackIds || []), packId]
                    }));
                    useUIStore.getState().showToast('🚀 XP Boost đã được kích hoạt cho gói này!');
                } else {
                    useUIStore.getState().showToast('Bạn không có Thuốc Tăng Lực XP.');
                }
            },

            activateCoinBoost: () => {
                const state = get();
                const coinBoosterCount = state.inventory[PowerUpId.COIN_BOOSTER] || 0;

                if (state.coinBoostExpiry && new Date(state.coinBoostExpiry) > new Date()) {
                    useUIStore.getState().showToast('Coin Boost đã được kích hoạt rồi.');
                    return;
                }

                if (coinBoosterCount > 0) {
                    get().usePowerUp(PowerUpId.COIN_BOOSTER);
                    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
                    set({ coinBoostExpiry: expiry });
                    useUIStore.getState().showToast('💰 Coin Boost 24 giờ đã được kích hoạt!');
                } else {
                    useUIStore.getState().showToast('Bạn không có Thuốc Nhân Đôi Coin.');
                }
            },
            
            // --- Quests ---
            refreshQuests: () => {
                const now = new Date();
                const todayStr = now.toISOString().split('T')[0];
                const lastDailyRefresh = get().lastQuestRefresh.daily;
                const lastWeeklyRefresh = get().lastQuestRefresh.weekly;
                let newQuests: Quest[] = [...get().activeQuests.filter(q => !q.claimed)];
                let refreshed = false;

                if (todayStr !== lastDailyRefresh) {
                    refreshed = true;
                    newQuests = newQuests.filter(q => q.type !== QuestType.DAILY);
                    const dailyTemplates = [...QUEST_TEMPLATES.DAILY].sort(() => 0.5 - Math.random());
                    const dailySelection = dailyTemplates.slice(0, 3).map(q => ({...q, progress: 0, claimed: false}));
                    newQuests.push(...dailySelection);
                    set(s => ({ lastQuestRefresh: {...s.lastQuestRefresh, daily: todayStr } }));
                }

                const todayDay = now.getDay(); // Sunday is 0, Monday is 1
                const lastWeeklyRefreshDate = new Date(lastWeeklyRefresh);
                const daysSinceLastWeekly = (now.getTime() - lastWeeklyRefreshDate.getTime()) / (1000 * 3600 * 24);

                if (todayDay === 1 && daysSinceLastWeekly >= 1) { // It's Monday and we haven't refreshed today
                    refreshed = true;
                    newQuests = newQuests.filter(q => q.type !== QuestType.WEEKLY);
                    const weeklyTemplates = [...QUEST_TEMPLATES.WEEKLY].sort(() => 0.5 - Math.random());
                    const weeklySelection = weeklyTemplates.slice(0, 3).map(q => ({...q, progress: 0, claimed: false}));
                    newQuests.push(...weeklySelection);
                    set(s => ({ lastQuestRefresh: {...s.lastQuestRefresh, weekly: todayStr } }));
                }
                
                if (refreshed) set({ activeQuests: newQuests });
            },

            claimQuestReward: (questId) => {
                set(state => {
                    const quest = state.activeQuests.find(q => q.id === questId);
                    if (!quest || quest.claimed || quest.progress < quest.target) return state;

                    get().addXp(quest.xpReward);
                    get().addStethoCoins(quest.coinReward);

                    return {
                        activeQuests: state.activeQuests.map(q => q.id === questId ? {...q, claimed: true} : q)
                    };
                });
            },

            updateQuestProgress: (category, value) => {
                set(state => {
                    const updatedQuests = state.activeQuests.map(quest => {
                        if (quest.category === category && !quest.claimed) {
                            let newProgress = quest.progress;
                             if (category === QuestCategory.MAINTAIN_STREAK) {
                                newProgress = Math.max(quest.progress, value); // For streak, take the max value
                            } else {
                                newProgress += value; // For others, accumulate
                            }
                            return { ...quest, progress: newProgress };
                        }
                        return quest;
                    });
                    return { activeQuests: updatedQuests };
                });
            }

        }),
        {
            name: LOCAL_STORAGE_KEY,
            onRehydrateStorage: () => (state) => {
                if (state) {
                    state.isLoggedIn = state.name !== DEFAULT_USER_NAME;
                    state.isGenerating = false;
                    state.tutorState = 'closed';
                    state.tutorMessages = [];
                }
            }
        }
    )
);