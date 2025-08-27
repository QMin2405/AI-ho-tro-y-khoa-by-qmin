import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import * as Types from '../types';
import { BADGES_DATA, XP_ACTIONS, COIN_ACTIONS, QUIZ_DIFFICULTY_POINTS, QUIZ_COMBO_BONUS, HOT_STREAK_THRESHOLD, INQUISITIVE_MIND_THRESHOLD, CONTENT_CURATOR_THRESHOLD, ARCHITECT_THRESHOLD, KNOWLEDGE_LIBRARY_THRESHOLD, INNOVATOR_THRESHOLD, AI_PARTNER_THRESHOLD, LIVING_LEGEND_THRESHOLD, XP_EARNER_1_THRESHOLD, STEEL_BRAIN_THRESHOLD, CONQUEROR_THRESHOLD, PACK_COLORS, POWER_UPS_DATA, QUEST_TEMPLATES, THEMES_DATA } from '../constants';
import { createStudyPack as createStudyPackService, askTutor, generateMoreQuestions as generateMoreQuestionsService } from '../services/geminiService';
import { useUIStore } from './useUIStore';
import { exportUserData, getLevelInfo } from '../utils/helpers';
import { ICON_MAP } from '../components/icons';

const LOCAL_STORAGE_KEY = 'smartMedTutorUserData';
const DEFAULT_USER_NAME = "Học viên Y khoa";

const initialUserData: Types.UserData = {
    name: DEFAULT_USER_NAME,
    level: 1,
    xp: 0,
    stethoCoins: 0,
    tributeClaimed: false,
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
    activeBoosts: {},
    isStreakShieldActive: false,
    activeQuests: [],
    lastQuestRefresh: {
        daily: new Date(0).toISOString().split('T')[0],
        weekly: new Date(0).toISOString().split('T')[0],
    },
    tutorXpGainsToday: { count: 0, date: new Date(0).toISOString().split('T')[0], limitNotified: false },
    ownedThemes: [Types.ThemeId.DEFAULT],
    activeTheme: Types.ThemeId.DEFAULT,
};

// Define the state shape
interface UserState extends Types.UserData {
    isLoggedIn: boolean;
    isGenerating: boolean;
    tutorState: 'closed' | 'open' | 'minimized' | 'maximized';
    tutorMessages: Types.ChatMessage[];
    isTutorLoading: boolean;
    tutorContext?: string;
}

// Define the actions
interface UserActions {
    setUserData: (data: Types.UserData) => void;
    importUserData: (file: File) => void;
    logout: () => void;
    changeName: (newName: string) => void;
    addXp: (amount: number, customMessage?: string) => void;
    addStethoCoins: (amount: number, customMessage?: string) => void;
    checkAndAwardBadges: () => void;
    checkDailyStreak: () => void;
    handleActivity: () => void;
    createStudyPack: (source: { text?: string; file?: File | null }) => Promise<boolean>;
    updateStudyPack: (updatedPack: Types.StudyPack) => void;
    recordLearningModeUsage: (packId: string, mode: Types.LearningMode) => void;
    // Standard Quiz Actions
    handleQuizAnswer: (packId: string, questionId: string, selectedAnswers: string[]) => void;
    handleQuizComplete: (pack: Types.StudyPack, session: Types.QuizSession) => void;
    // M2 Staatexam Quiz Actions
    handleM2StaatexamQuizAnswer: (packId: string, questionId: string, selectedAnswers: string[]) => void;
    handleM2StaatexamQuizComplete: (pack: Types.StudyPack, session: Types.QuizSession) => void;

    generateMoreQuestions: (packId: string, isM2Style: boolean, options?: { startNewSessionWithNewQuestions?: boolean }) => Promise<void>;
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
    buyPowerUp: (powerUpId: Types.PowerUpId) => void;
    usePowerUp: (powerUpId: Types.PowerUpId) => void;
    activatePowerUp: (powerUpId: Types.PowerUpId) => void;
    // Themes
    buyTheme: (themeId: Types.ThemeId) => void;
    setTheme: (themeId: Types.ThemeId) => void;
    // Quests
    refreshQuests: () => void;
    claimQuestReward: (questId: string) => void;
    updateQuestProgress: (category: Types.QuestCategory, value: number) => void;
    // Tribute
    claimTribute: () => void;
}

const getDescendantIds = (folderId: string, allFolders: Types.Folder[], allPacks: Types.StudyPack[]) => {
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
                        const importedData = JSON.parse(event.target?.result as string) as Types.UserData;
                        if (importedData.name && Array.isArray(importedData.studyPacks)) {
                            // Merge with initial data to ensure new fields (like themes) have defaults
                            const finalData = { ...initialUserData, ...importedData };
                            get().setUserData(finalData);
                            useUIStore.getState().showToast("Dữ liệu đã được khôi phục thành công!");
                        } else { 
                            throw new Error("Invalid data format."); 
                        }
                    } catch (error) { 
                        useUIStore.getState().showToast("Lỗi: Tệp dữ liệu không hợp lệ."); 
                    }
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
            
            addXp: (amount, customMessage) => {
                if (!get().isLoggedIn) return;
                
                const state = get();
                const roundedAmount = Math.round(amount);
                if (roundedAmount <= 0) return;

                const doubleXpBoost = state.activeBoosts?.DOUBLE_XP;
                let finalAmount = roundedAmount;
                let boostMessage = '';

                if (doubleXpBoost && doubleXpBoost.expiresAt > Date.now()) {
                    finalAmount *= 2;
                    boostMessage = ` (x2 XP!)`;
                }
            
                const oldXp = get().xp;
                const oldLevel = getLevelInfo(oldXp).level;
            
                set(s => ({ xp: s.xp + finalAmount }));
                useUIStore.getState().showToast(customMessage || `+${finalAmount} XP!${boostMessage}`);
            
                const newXp = get().xp;
                const newLevel = getLevelInfo(newXp).level;
            
                if (newLevel > oldLevel) {
                    const reward = newLevel * COIN_ACTIONS.LEVEL_UP_MULTIPLIER;
                    get().addStethoCoins(reward, `🎉 Lên cấp! +${reward} Stetho Coins`);
                }
                get().updateQuestProgress(Types.QuestCategory.EARN_XP, finalAmount);
            },
            
            addStethoCoins: (amount, customMessage) => {
                if (!get().isLoggedIn) return;

                const state = get();
                const roundedAmount = Math.round(amount);
                if (roundedAmount <= 0) return;

                const doubleCoinsBoost = state.activeBoosts?.DOUBLE_COINS;
                let finalAmount = roundedAmount;
                let boostMessage = '';

                if (doubleCoinsBoost && doubleCoinsBoost.expiresAt > Date.now()) {
                    finalAmount *= 2;
                    boostMessage = ` (x2 Coins!)`;
                }

                if (finalAmount > 0) {
                    set(s => ({ stethoCoins: s.stethoCoins + finalAmount }));
                    useUIStore.getState().showToast(customMessage || `🪙 +${finalAmount} Stetho Coins!${boostMessage}`);
                }
            },
            
            checkAndAwardBadges: () => {
                const state = get();
                const newlyUnlocked: Types.BadgeId[] = [];
                const hasBadge = (id: Types.BadgeId) => state.unlockedBadges.includes(id);

                if (!hasBadge(Types.BadgeId.FIRST_PACK) && state.studyPacks.length > 0) newlyUnlocked.push(Types.BadgeId.FIRST_PACK);
                if (!hasBadge(Types.BadgeId.THE_ARCHITECT) && state.studyPacks.length >= ARCHITECT_THRESHOLD) newlyUnlocked.push(Types.BadgeId.THE_ARCHITECT);
                if (!hasBadge(Types.BadgeId.CONTENT_CURATOR) && state.studyPacks.length >= CONTENT_CURATOR_THRESHOLD) newlyUnlocked.push(Types.BadgeId.CONTENT_CURATOR);
                if (!hasBadge(Types.BadgeId.KNOWLEDGE_LIBRARY) && state.studyPacks.length >= KNOWLEDGE_LIBRARY_THRESHOLD) newlyUnlocked.push(Types.BadgeId.KNOWLEDGE_LIBRARY);
                if (!hasBadge(Types.BadgeId.INQUISITIVE_MIND) && state.questionsAskedCount >= INQUISITIVE_MIND_THRESHOLD) newlyUnlocked.push(Types.BadgeId.INQUISITIVE_MIND);
                if (!hasBadge(Types.BadgeId.AI_PARTNER) && state.questionsAskedCount >= AI_PARTNER_THRESHOLD) newlyUnlocked.push(Types.BadgeId.AI_PARTNER);
                if (!hasBadge(Types.BadgeId.THE_INNOVATOR) && state.generatedQuestionCount >= INNOVATOR_THRESHOLD) newlyUnlocked.push(Types.BadgeId.THE_INNOVATOR);
                if (!hasBadge(Types.BadgeId.LEVEL_5_REACHED) && state.level >= 5) newlyUnlocked.push(Types.BadgeId.LEVEL_5_REACHED);
                if (!hasBadge(Types.BadgeId.LEVEL_10_REACHED) && state.level >= 10) newlyUnlocked.push(Types.BadgeId.LEVEL_10_REACHED);
                if (!hasBadge(Types.BadgeId.THE_MASTER) && state.level >= 15) newlyUnlocked.push(Types.BadgeId.THE_MASTER);
                if (!hasBadge(Types.BadgeId.XP_EARNER_1) && state.xp >= XP_EARNER_1_THRESHOLD) newlyUnlocked.push(Types.BadgeId.XP_EARNER_1);
                if (!hasBadge(Types.BadgeId.LIVING_LEGEND) && state.xp >= LIVING_LEGEND_THRESHOLD) newlyUnlocked.push(Types.BadgeId.LIVING_LEGEND);
                if (!hasBadge(Types.BadgeId.PERFECT_WEEK) && state.streak >= 7) newlyUnlocked.push(Types.BadgeId.PERFECT_WEEK);
                if (!hasBadge(Types.BadgeId.STREAK_30_DAYS) && state.streak >= 30) newlyUnlocked.push(Types.BadgeId.STREAK_30_DAYS);
                if (!hasBadge(Types.BadgeId.STEEL_BRAIN) && state.totalCorrectAnswers >= STEEL_BRAIN_THRESHOLD) newlyUnlocked.push(Types.BadgeId.STEEL_BRAIN);
                if (!hasBadge(Types.BadgeId.THE_CONQUEROR) && state.perfectQuizCompletions >= CONQUEROR_THRESHOLD) newlyUnlocked.push(Types.BadgeId.THE_CONQUEROR);

                // HOLISTIC_LEARNER
                if (!hasBadge(Types.BadgeId.HOLISTIC_LEARNER)) {
                    const requiredModes = [Types.LearningMode.SUMMARY, Types.LearningMode.QUIZ, Types.LearningMode.FILL_IN_THE_BLANK, Types.LearningMode.GLOSSARY];
                    if (state.studyPacks.some(p => requiredModes.every(mode => (p.usedLearningModes || []).includes(mode)))) {
                        newlyUnlocked.push(Types.BadgeId.HOLISTIC_LEARNER);
                    }
                }
                
                // SUBJECT_MATTER_EXPERT
                if (!hasBadge(Types.BadgeId.SUBJECT_MATTER_EXPERT)) {
                    if (state.studyPacks.some(p => p.progress >= 100)) {
                        newlyUnlocked.push(Types.BadgeId.SUBJECT_MATTER_EXPERT);
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
                    if (get().isStreakShieldActive) {
                        set({ isStreakShieldActive: false });
                        useUIStore.getState().showToast("🛡️ Khiên bảo vệ chuỗi đã được sử dụng!");
                        const yesterday = new Date();
                        yesterday.setDate(yesterday.getDate() - 1);
                        set({ lastActivityDate: yesterday.toISOString() });
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
                get().updateQuestProgress(Types.QuestCategory.MAINTAIN_STREAK, newStreakValue);

                const currentHour = new Date().getHours();
                if (currentHour >= 22 && !get().unlockedBadges.includes(Types.BadgeId.NIGHT_OWL)) {
                    set(prev => ({ unlockedBadges: [...prev.unlockedBadges, Types.BadgeId.NIGHT_OWL] }));
                    useUIStore.getState().showToast(`🏆 Huy hiệu mới: ${BADGES_DATA[Types.BadgeId.NIGHT_OWL].name}!`);
                }
                if (currentHour < 7 && !get().unlockedBadges.includes(Types.BadgeId.EARLY_BIRD)) {
                     set(prev => ({ unlockedBadges: [...prev.unlockedBadges, Types.BadgeId.EARLY_BIRD] }));
                     useUIStore.getState().showToast(`🏆 Huy hiệu mới: ${BADGES_DATA[Types.BadgeId.EARLY_BIRD].name}!`);
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

                    const newPack: Types.StudyPack = {
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
                    addXp(XP_ACTIONS.CREATE_PACK);
                    handleActivity();
                    updateQuestProgress(Types.QuestCategory.CREATE_PACK, 1);
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
                            get().addXp(XP_ACTIONS.PERSONAL_TOUCH);
                            updatedPack.hasBeenCustomized = true; 
                        }
            
                        if (!get().unlockedBadges.includes(Types.BadgeId.PERSONAL_TOUCH)) {
                            set(prev => ({ unlockedBadges: [...prev.unlockedBadges, Types.BadgeId.PERSONAL_TOUCH] }));
                            useUIStore.getState().showToast(`🏆 Huy hiệu mới: ${BADGES_DATA[Types.BadgeId.PERSONAL_TOUCH].name}!`);
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
        
                const session: Types.QuizSession = pack.quizSession || {
                    currentQuestionIndex: 0, comboCount: 0, submittedAnswers: {},
                    incorrectlyAnsweredIds: [], activeQuestionIds: pack.quiz.map(q => q.uniqueId),
                };
        
                const isCorrect = question.correctAnswers.length === selectedAnswers.length &&
                                  question.correctAnswers.every(ans => selectedAnswers.includes(ans));
                const newComboCount = isCorrect ? session.comboCount + 1 : 0;
                
                if (isCorrect && !state.correctlyAnsweredQuizIds.includes(questionId)) {
                    let xpGained = 0;
                    let toastMessage: string | null = null;
                    
                    let baseAmount = XP_ACTIONS.QUIZ_CORRECT_ANSWER + (QUIZ_DIFFICULTY_POINTS[question.difficulty as Types.QuizDifficulty] || 0);
                    if (newComboCount > 1) {
                        baseAmount += QUIZ_COMBO_BONUS * (newComboCount - 1);
                    }
                    const streakMultiplier = state.streak > 1 ? 1 + (state.streak - 1) * 0.2 : 1;
                    xpGained = Math.round(baseAmount * streakMultiplier);
        
                    toastMessage = streakMultiplier > 1
                        ? `+${xpGained} XP! (Thưởng chuỗi x${streakMultiplier.toFixed(1)})`
                        : `+${xpGained} XP!`;
                    
                    get().addXp(xpGained, toastMessage);
                    get().updateQuestProgress(Types.QuestCategory.ANSWER_CORRECTLY, 1);

                    let coinsGained = 0;
                    switch (question.difficulty) {
                        case Types.QuizDifficulty.EASY: coinsGained = COIN_ACTIONS.QUIZ_CORRECT_EASY; break;
                        case Types.QuizDifficulty.MEDIUM: coinsGained = COIN_ACTIONS.QUIZ_CORRECT_MEDIUM; break;
                        case Types.QuizDifficulty.HARD: coinsGained = COIN_ACTIONS.QUIZ_CORRECT_HARD; break;
                    }
                    get().addStethoCoins(coinsGained);
                }
        
                set(prev => {
                    const newSubmittedAnswers: Record<string, Types.SubmittedAnswer> = {
                        ...session.submittedAnswers,
                        [questionId]: { selectedAnswers, isCorrect }
                    };
                    const newIncorrectlyAnsweredIds = !isCorrect && !session.incorrectlyAnsweredIds.includes(questionId)
                        ? [...session.incorrectlyAnsweredIds, questionId]
                        : session.incorrectlyAnsweredIds.filter(id => !(id === questionId && isCorrect));
                    
                    const newSession: Types.QuizSession = {
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
                
                if (isCorrect && newComboCount >= HOT_STREAK_THRESHOLD && !get().unlockedBadges.includes(Types.BadgeId.HOT_STREAK)) {
                    set(prev => ({ unlockedBadges: [...prev.unlockedBadges, Types.BadgeId.HOT_STREAK] }));
                }
            },
            
            handleQuizComplete: (pack, session) => {
                const originalQuestionsCount = pack.originalQuizCount || pack.quiz.length;
                if (session.activeQuestionIds.length >= originalQuestionsCount) get().handleActivity();

                const score = Object.values(session.submittedAnswers).filter((a: Types.SubmittedAnswer) => a.isCorrect).length;
                const isPerfect = score === session.activeQuestionIds.length && session.activeQuestionIds.length > 0;
                
                get().updateQuestProgress(Types.QuestCategory.COMPLETE_QUIZ, 1);
                if (isPerfect) {
                    set(prev => ({ perfectQuizCompletions: prev.perfectQuizCompletions + 1 }));

                    if (!get().unlockedBadges.includes(Types.BadgeId.FLAWLESS_VICTORY)) {
                        const questionsInSession = pack.quiz.filter(q => session.activeQuestionIds.includes(q.uniqueId));
                        const hasHardQuestion = questionsInSession.some(q => q.difficulty === Types.QuizDifficulty.HARD);
                        if (hasHardQuestion) {
                            set(prev => ({ unlockedBadges: [...prev.unlockedBadges, Types.BadgeId.FLAWLESS_VICTORY] }));
                            useUIStore.getState().showToast(`🏆 Huy hiệu mới: ${BADGES_DATA[Types.BadgeId.FLAWLESS_VICTORY].name}!`);
                        }
                    }
                }
                
                if (!get().unlockedBadges.includes(Types.BadgeId.FIRST_QUIZ)) {
                    set(prev => ({ unlockedBadges: [...prev.unlockedBadges, Types.BadgeId.FIRST_QUIZ] }));
                    useUIStore.getState().showToast(`🏆 Huy hiệu mới: ${BADGES_DATA[Types.BadgeId.FIRST_QUIZ].name}!`);
                }
                get().checkAndAwardBadges();
            },

            handleM2StaatexamQuizAnswer: (packId, questionId, selectedAnswers) => {
                const state = get();
                const pack = state.studyPacks.find(p => p.id === packId);
                const question = pack?.m2StaatexamQuiz?.find(q => q.uniqueId === questionId);
        
                if (!pack || !question || !pack.m2StaatexamQuiz) return;
        
                const session: Types.QuizSession = pack.m2StaatexamQuizSession || {
                    currentQuestionIndex: 0, comboCount: 0, submittedAnswers: {},
                    incorrectlyAnsweredIds: [], activeQuestionIds: pack.m2StaatexamQuiz.map(q => q.uniqueId),
                };
        
                const isCorrect = question.correctAnswers.length === selectedAnswers.length &&
                                  question.correctAnswers.every(ans => selectedAnswers.includes(ans));
                const newComboCount = isCorrect ? session.comboCount + 1 : 0;
                
                if (isCorrect && !state.correctlyAnsweredQuizIds.includes(questionId)) {
                    let xpGained = 0;
                    let toastMessage: string | null = null;
                    let baseAmount = XP_ACTIONS.QUIZ_CORRECT_ANSWER + (QUIZ_DIFFICULTY_POINTS[question.difficulty as Types.QuizDifficulty] || 0);
                    if (newComboCount > 1) baseAmount += QUIZ_COMBO_BONUS * (newComboCount - 1);
                    const streakMultiplier = state.streak > 1 ? 1 + (state.streak - 1) * 0.2 : 1;
                    xpGained = Math.round(baseAmount * streakMultiplier);
                    toastMessage = streakMultiplier > 1 ? `+${xpGained} XP! (Thưởng chuỗi x${streakMultiplier.toFixed(1)})` : `+${xpGained} XP!`;
                    get().addXp(xpGained, toastMessage);
                    get().updateQuestProgress(Types.QuestCategory.ANSWER_CORRECTLY, 1);

                    let coinsGained = 0;
                    switch (question.difficulty) {
                        case Types.QuizDifficulty.EASY: coinsGained = COIN_ACTIONS.QUIZ_CORRECT_EASY; break;
                        case Types.QuizDifficulty.MEDIUM: coinsGained = COIN_ACTIONS.QUIZ_CORRECT_MEDIUM; break;
                        case Types.QuizDifficulty.HARD: coinsGained = COIN_ACTIONS.QUIZ_CORRECT_HARD; break;
                    }
                    get().addStethoCoins(coinsGained);
                }
        
                set(prev => {
                    const newSubmittedAnswers: Record<string, Types.SubmittedAnswer> = {
                        ...session.submittedAnswers,
                        [questionId]: { selectedAnswers, isCorrect }
                    };
                    const newIncorrectlyAnsweredIds = !isCorrect && !session.incorrectlyAnsweredIds.includes(questionId)
                        ? [...session.incorrectlyAnsweredIds, questionId]
                        : session.incorrectlyAnsweredIds.filter(id => !(id === questionId && isCorrect));
                    
                    const newSession: Types.QuizSession = { ...session, comboCount: newComboCount, submittedAnswers: newSubmittedAnswers, incorrectlyAnsweredIds: newIncorrectlyAnsweredIds };
                    const newCorrectlyAnsweredIds = (isCorrect && !prev.correctlyAnsweredQuizIds.includes(questionId)) ? [...prev.correctlyAnsweredQuizIds, questionId] : prev.correctlyAnsweredQuizIds;
                    const newTotalCorrectAnswers = (isCorrect && !prev.correctlyAnsweredQuizIds.includes(questionId)) ? prev.totalCorrectAnswers + 1 : prev.totalCorrectAnswers;
                    
                    const updatedPacks = prev.studyPacks.map(p => p.id === packId ? { ...p, m2StaatexamQuizSession: newSession } : p);
                    
                    return {
                        correctlyAnsweredQuizIds: newCorrectlyAnsweredIds,
                        totalCorrectAnswers: newTotalCorrectAnswers,
                        studyPacks: updatedPacks
                    };
                });
        
                if (isCorrect && newComboCount >= HOT_STREAK_THRESHOLD && !get().unlockedBadges.includes(Types.BadgeId.HOT_STREAK)) {
                    set(prev => ({ unlockedBadges: [...prev.unlockedBadges, Types.BadgeId.HOT_STREAK] }));
                }
            },

            handleM2StaatexamQuizComplete: (pack, session) => {
                get().handleActivity();
                const score = Object.values(session.submittedAnswers).filter((a: Types.SubmittedAnswer) => a.isCorrect).length;
                const isPerfect = score === session.activeQuestionIds.length && session.activeQuestionIds.length > 0;
                
                get().updateQuestProgress(Types.QuestCategory.COMPLETE_QUIZ, 1);
                if (isPerfect) {
                    set(prev => ({ perfectQuizCompletions: prev.perfectQuizCompletions + 1 }));

                    if (!get().unlockedBadges.includes(Types.BadgeId.FLAWLESS_VICTORY)) {
                        const questionsInSession = (pack.m2StaatexamQuiz || []).filter(q => session.activeQuestionIds.includes(q.uniqueId));
                        const hasHardQuestion = questionsInSession.some(q => q.difficulty === Types.QuizDifficulty.HARD);
                        if (hasHardQuestion) {
                            set(prev => ({ unlockedBadges: [...prev.unlockedBadges, Types.BadgeId.FLAWLESS_VICTORY] }));
                            useUIStore.getState().showToast(`🏆 Huy hiệu mới: ${BADGES_DATA[Types.BadgeId.FLAWLESS_VICTORY].name}!`);
                        }
                    }
                }
                
                if (!get().unlockedBadges.includes(Types.BadgeId.FIRST_QUIZ)) {
                    set(prev => ({ unlockedBadges: [...prev.unlockedBadges, Types.BadgeId.FIRST_QUIZ] }));
                    useUIStore.getState().showToast(`🏆 Huy hiệu mới: ${BADGES_DATA[Types.BadgeId.FIRST_QUIZ].name}!`);
                }
                get().checkAndAwardBadges();
            },
            
            // Fix: Add explicit type annotation for the 'options' parameter to resolve property access error.
            generateMoreQuestions: async (packId: string, isM2Style: boolean, options: { startNewSessionWithNewQuestions?: boolean } = {}) => {
                const { startNewSessionWithNewQuestions = false } = options;
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
            
                            const quizKey = isM2Style ? 'm2StaatexamQuiz' : 'quiz';
                            const sessionKey = isM2Style ? 'm2StaatexamQuizSession' : 'quizSession';
                            const currentQuiz = packToUpdate[quizKey] || [];
                            const newQuestions = newQuestionsData.map((q, i) => ({
                                ...q,
                                uniqueId: `${packId}_${isM2Style ? 'm2' : 'q'}_${Date.now()}_${i}`
                            }));
                            
                            const updatedQuiz = [...currentQuiz, ...newQuestions];
                            let updatedSession: Types.QuizSession | undefined;

                            if (startNewSessionWithNewQuestions) {
                                // Start a completely new session with only the new questions
                                updatedSession = {
                                    currentQuestionIndex: 0,
                                    comboCount: 0,
                                    submittedAnswers: {},
                                    incorrectlyAnsweredIds: [],
                                    activeQuestionIds: newQuestions.map(q => q.uniqueId)
                                };
                            } else {
                                // Append to the existing session if it exists
                                const currentSession = packToUpdate[sessionKey];
                                if (currentSession) {
                                    updatedSession = {
                                        ...currentSession,
                                        activeQuestionIds: [...currentSession.activeQuestionIds, ...newQuestions.map(q => q.uniqueId)]
                                    };
                                } else {
                                    // This case shouldn't happen during a quiz, but as a fallback, don't create a session.
                                    updatedSession = undefined;
                                }
                            }
            
                            const updatedPack = {
                                ...packToUpdate,
                                [quizKey]: updatedQuiz,
                                [sessionKey]: updatedSession
                            };
            
                            return {
                                studyPacks: state.studyPacks.map(p => p.id === packId ? updatedPack : p),
                                generatedQuestionCount: state.generatedQuestionCount + newQuestions.length,
                            };
                        });
                        get().addXp(XP_ACTIONS.ASK_AI * 2);
                        useUIStore.getState().showToast(`✨ Đã tạo ${newQuestionsData.length} câu hỏi mới!`);
                    } else {
                         useUIStore.getState().showToast(`Không thể tạo thêm câu hỏi vào lúc này.`);
                    }
                } catch (error) {
                    console.error("Error generating more questions:", error);
                    useUIStore.getState().showToast("Lỗi: Không thể tạo thêm câu hỏi.");
                } finally {
                    set({ isGenerating: false });
                }
            },

            openTutor: (greeting) => {
                set(state => {
                    const messages = state.tutorMessages.length > 0 ? state.tutorMessages : [{ sender: 'ai', text: greeting || 'Chào bạn! Tôi có thể giúp gì cho bạn?' } as Types.ChatMessage];
                    return { tutorState: 'open', tutorMessages: messages };
                });
            },
            closeTutor: () => set({ tutorState: 'closed', tutorContext: undefined, tutorMessages: [] }),
            minimizeTutor: () => set({ tutorState: 'minimized' }),
            toggleTutorSize: () => set(state => ({ tutorState: state.tutorState === 'maximized' ? 'open' : 'maximized' })),
            
            sendMessageToTutor: async (message) => {
                if (get().isTutorLoading) return;
                
                const today = new Date().toISOString().split('T')[0];
                let tutorXpData = get().tutorXpGainsToday || { count: 0, date: today, limitNotified: false };
                if (tutorXpData.date !== today) {
                    tutorXpData = { count: 0, date: today, limitNotified: false };
                }

                set(state => ({
                    isTutorLoading: true,
                    tutorMessages: [...state.tutorMessages, { sender: 'user', text: message }],
                }));

                const fullLessonContext = get().studyPacks.map(p => p.lesson.map(l => l.content).join('\n')).join('\n\n');
                
                try {
                    const response = await askTutor(fullLessonContext, message, get().tutorContext);
                    set(state => ({
                        tutorMessages: [...state.tutorMessages, { sender: 'ai', text: response }],
                        questionsAskedCount: state.questionsAskedCount + 1,
                    }));
                    get().handleActivity();

                    if (tutorXpData.count < 10) {
                        get().addXp(XP_ACTIONS.ASK_AI);
                        set({ tutorXpGainsToday: { ...tutorXpData, count: tutorXpData.count + 1 } });
                    } else if (!tutorXpData.limitNotified) {
                        useUIStore.getState().showToast("Bạn đã đạt giới hạn XP nhận được từ Gia sư AI hôm nay.");
                        set({ tutorXpGainsToday: { ...tutorXpData, limitNotified: true } });
                    }

                } catch (error) {
                    set(state => ({
                        tutorMessages: [...state.tutorMessages, { sender: 'ai', text: "Xin lỗi, tôi gặp lỗi khi xử lý yêu cầu của bạn." }],
                    }));
                } finally {
                    set({ isTutorLoading: false });
                }
            },

            setTutorContextAndOpen: (context, greeting) => {
                set({ tutorContext: context });
                get().openTutor(greeting);
            },
            clearTutorContext: () => set({ tutorContext: undefined }),

            createFolder: (parentId) => {
                const newFolder: Types.Folder = {
                    id: `folder_${Date.now()}`,
                    name: 'Thư mục mới',
                    parentId: parentId || null,
                };
                set(state => ({ folders: [...state.folders, newFolder] }));
            },
            updateFolder: (id, newName, newIcon) => {
                set(state => ({
                    folders: state.folders.map(f => f.id === id ? { ...f, name: newName, icon: newIcon } : f),
                }));
            },
            movePacksToFolder: (packIds, folderId) => {
                set(state => ({
                    studyPacks: state.studyPacks.map(p => packIds.includes(p.id) ? { ...p, folderId: folderId } : p),
                }));
            },
            
            softDeleteItem: (id, type) => {
                const state = get();
                let xpToDeduct = 0;
                const deletionTimestamp = new Date().toISOString();

                const calculateXpForPack = (pack: Types.StudyPack) => {
                    let packXp = XP_ACTIONS.CREATE_PACK;
                    if (pack.hasBeenCustomized) {
                        packXp += XP_ACTIONS.PERSONAL_TOUCH;
                    }
                    const allQuestionsInPack = [...(pack.quiz || []), ...(pack.m2StaatexamQuiz || [])];
                    for (const question of allQuestionsInPack) {
                        if (state.correctlyAnsweredQuizIds.includes(question.uniqueId)) {
                            const baseAmount = XP_ACTIONS.QUIZ_CORRECT_ANSWER + (QUIZ_DIFFICULTY_POINTS[question.difficulty as Types.QuizDifficulty] || 0);
                            packXp += baseAmount;
                        }
                    }
                    return packXp;
                };

                if (type === 'pack') {
                    const packToSoftDelete = state.studyPacks.find(p => p.id === id);
                    if (packToSoftDelete) {
                        xpToDeduct = calculateXpForPack(packToSoftDelete);
                        set(s => ({
                            studyPacks: s.studyPacks.map(p => p.id === id ? { ...p, isDeleted: true, deletedAt: deletionTimestamp } : p),
                            xp: Math.max(0, s.xp - xpToDeduct)
                        }));
                    }
                } else {
                    const { folderIds, packIds } = getDescendantIds(id, state.folders, state.studyPacks);
                    const allFoldersToDelete = [id, ...folderIds];
                    const packsToSoftDelete = state.studyPacks.filter(p => packIds.includes(p.id));

                    packsToSoftDelete.forEach(pack => {
                        xpToDeduct += calculateXpForPack(pack);
                    });

                    set(s => ({
                        folders: s.folders.map(f => allFoldersToDelete.includes(f.id) ? { ...f, isDeleted: true, deletedAt: deletionTimestamp } : f),
                        studyPacks: s.studyPacks.map(p => packIds.includes(p.id) ? { ...p, isDeleted: true, deletedAt: deletionTimestamp } : p),
                        xp: Math.max(0, s.xp - xpToDeduct)
                    }));
                }
                useUIStore.getState().showToast(`Đã chuyển vào thùng rác. Đã trừ ${xpToDeduct} XP.`);
            },
            
            requestSoftDelete: (id, type) => {
                 const { softDeleteItem } = get();
                useUIStore.getState().showConfirmModal({
                    title: `Chuyển vào thùng rác?`,
                    text: `Mục này sẽ được chuyển vào thùng rác. Tất cả XP kiếm được từ mục này sẽ bị trừ ngay lập tức. Bạn có thể khôi phục lại cả mục và XP sau.`,
                    confirmText: 'Chuyển vào thùng rác',
                    onConfirm: () => softDeleteItem(id, type),
                    isDestructive: true,
                });
            },
            
            restoreItem: (id, type) => {
                const state = get();
                let xpToRestore = 0;

                const calculateXpForPack = (pack: Types.StudyPack) => {
                    let packXp = XP_ACTIONS.CREATE_PACK;
                    if (pack.hasBeenCustomized) {
                        packXp += XP_ACTIONS.PERSONAL_TOUCH;
                    }
                    const allQuestionsInPack = [...(pack.quiz || []), ...(pack.m2StaatexamQuiz || [])];
                    for (const question of allQuestionsInPack) {
                        if (state.correctlyAnsweredQuizIds.includes(question.uniqueId)) {
                            const baseAmount = XP_ACTIONS.QUIZ_CORRECT_ANSWER + (QUIZ_DIFFICULTY_POINTS[question.difficulty as Types.QuizDifficulty] || 0);
                            packXp += baseAmount;
                        }
                    }
                    return packXp;
                };

                if (type === 'pack') {
                    const packToRestore = state.studyPacks.find(p => p.id === id);
                    if (packToRestore) {
                        xpToRestore = calculateXpForPack(packToRestore);
                        const parentIsDeleted = state.folders.some(f => f.id === packToRestore.folderId && f.isDeleted);
                        set(s => ({
                            studyPacks: s.studyPacks.map(p => p.id === id ? { ...p, isDeleted: false, deletedAt: undefined, folderId: parentIsDeleted ? null : p.folderId } : p),
                            xp: s.xp + xpToRestore
                        }));
                    }
                } else {
                    const { folderIds, packIds } = getDescendantIds(id, state.folders, state.studyPacks);
                    const allFoldersToRestore = [id, ...folderIds];
                    const packsToRestore = state.studyPacks.filter(p => packIds.includes(p.id));

                    packsToRestore.forEach(pack => {
                        xpToRestore += calculateXpForPack(pack);
                    });
                    
                    const folderToRestore = state.folders.find(f => f.id === id);
                    const parentIsDeleted = state.folders.some(f => f.id === folderToRestore?.parentId && f.isDeleted);
                    
                    set(s => ({
                        folders: s.folders.map(f => allFoldersToRestore.includes(f.id) 
                            ? { ...f, isDeleted: false, deletedAt: undefined, parentId: (f.id === id && parentIsDeleted) ? null : f.parentId } 
                            : f),
                        studyPacks: s.studyPacks.map(p => packIds.includes(p.id) ? { ...p, isDeleted: false, deletedAt: undefined } : p),
                        xp: s.xp + xpToRestore
                    }));
                }
                useUIStore.getState().showToast(`Đã khôi phục. Đã hoàn lại ${xpToRestore} XP.`);
            },
            
            permanentDeleteItem: (id, type) => {
                if (type === 'pack') {
                    set(state => {
                        const packToDelete = state.studyPacks.find(p => p.id === id);
                        if (!packToDelete) return state;

                        const allQuestionsInPack = [...(packToDelete.quiz || []), ...(packToDelete.m2StaatexamQuiz || [])];
                        const answeredQuestionIdsInPack = new Set<string>();

                        for (const question of allQuestionsInPack) {
                            if (state.correctlyAnsweredQuizIds.includes(question.uniqueId)) {
                                answeredQuestionIdsInPack.add(question.uniqueId);
                            }
                        }
                        
                        const newCorrectlyAnsweredQuizIds = state.correctlyAnsweredQuizIds.filter(qid => !answeredQuestionIdsInPack.has(qid));
                        const newTotalCorrectAnswers = state.totalCorrectAnswers - answeredQuestionIdsInPack.size;

                        return { 
                            studyPacks: state.studyPacks.filter(p => p.id !== id),
                            correctlyAnsweredQuizIds: newCorrectlyAnsweredQuizIds,
                            totalCorrectAnswers: newTotalCorrectAnswers
                        };
                    });
                } else {
                    const { folderIds, packIds } = getDescendantIds(id, get().folders, get().studyPacks);
                    const allFolderIdsToDelete = [id, ...folderIds];

                    set(state => {
                        const allAnsweredIdsToClear = new Set<string>();
                        const packsToDelete = state.studyPacks.filter(p => packIds.includes(p.id));

                        for (const packToDelete of packsToDelete) {
                            const allQuestionsInPack = [...(packToDelete.quiz || []), ...(packToDelete.m2StaatexamQuiz || [])];
                            for (const question of allQuestionsInPack) {
                                if (state.correctlyAnsweredQuizIds.includes(question.uniqueId)) {
                                    allAnsweredIdsToClear.add(question.uniqueId);
                                }
                            }
                        }

                        const newCorrectlyAnsweredQuizIds = state.correctlyAnsweredQuizIds.filter(qid => !allAnsweredIdsToClear.has(qid));
                        const newTotalCorrectAnswers = state.totalCorrectAnswers - allAnsweredIdsToClear.size;

                        return {
                            folders: state.folders.filter(f => !allFolderIdsToDelete.includes(f.id)),
                            studyPacks: state.studyPacks.filter(p => !packIds.includes(p.id)),
                            correctlyAnsweredQuizIds: newCorrectlyAnsweredQuizIds,
                            totalCorrectAnswers: newTotalCorrectAnswers
                        };
                    });
                }
                useUIStore.getState().showToast("Đã xóa vĩnh viễn.");
            },

            requestPermanentDelete: (id, type) => {
                const { permanentDeleteItem } = get();
                useUIStore.getState().showConfirmModal({
                    title: `Xóa vĩnh viễn?`,
                    text: 'Hành động này sẽ xóa vĩnh viễn mục này và tất cả tiến trình liên quan. Hành động này không thể hoàn tác.',
                    confirmText: 'Xóa vĩnh viễn',
                    onConfirm: () => permanentDeleteItem(id, type),
                    isDestructive: true,
                });
            },

            restoreAll: () => {
                const state = get();
                let totalXpToRestore = 0;

                const calculateXpForPack = (pack: Types.StudyPack) => {
                    let packXp = XP_ACTIONS.CREATE_PACK;
                    if (pack.hasBeenCustomized) {
                        packXp += XP_ACTIONS.PERSONAL_TOUCH;
                    }
                    const allQuestionsInPack = [...(pack.quiz || []), ...(pack.m2StaatexamQuiz || [])];
                    for (const question of allQuestionsInPack) {
                        if (state.correctlyAnsweredQuizIds.includes(question.uniqueId)) {
                            const baseAmount = XP_ACTIONS.QUIZ_CORRECT_ANSWER + (QUIZ_DIFFICULTY_POINTS[question.difficulty as Types.QuizDifficulty] || 0);
                            packXp += baseAmount;
                        }
                    }
                    return packXp;
                };

                state.studyPacks.forEach(pack => {
                    if (pack.isDeleted) {
                        totalXpToRestore += calculateXpForPack(pack);
                    }
                });

                set(s => ({
                    folders: s.folders.map(f => f.isDeleted ? { ...f, isDeleted: false, deletedAt: undefined } : f),
                    studyPacks: s.studyPacks.map(p => p.isDeleted ? { ...p, isDeleted: false, deletedAt: undefined } : p),
                    xp: s.xp + totalXpToRestore
                }));
                useUIStore.getState().showToast(`Đã khôi phục tất cả. Đã hoàn lại ${totalXpToRestore} XP.`);
            },

            permanentDeleteAll: () => {
                set(state => {
                    const allAnsweredIdsToClear = new Set<string>();
                    const packsToDelete = state.studyPacks.filter(p => p.isDeleted);
            
                    for (const packToDelete of packsToDelete) {
                        const allQuestionsInPack = [...(packToDelete.quiz || []), ...(packToDelete.m2StaatexamQuiz || [])];
                        for (const question of allQuestionsInPack) {
                            if (state.correctlyAnsweredQuizIds.includes(question.uniqueId)) {
                                allAnsweredIdsToClear.add(question.uniqueId);
                            }
                        }
                    }
                    
                    const newCorrectlyAnsweredQuizIds = state.correctlyAnsweredQuizIds.filter(qid => !allAnsweredIdsToClear.has(qid));
                    const newTotalCorrectAnswers = state.totalCorrectAnswers - allAnsweredIdsToClear.size;
            
                    return {
                        folders: state.folders.filter(f => !f.isDeleted),
                        studyPacks: state.studyPacks.filter(p => !p.isDeleted),
                        correctlyAnsweredQuizIds: newCorrectlyAnsweredQuizIds,
                        totalCorrectAnswers: newTotalCorrectAnswers
                    };
                });
                useUIStore.getState().showToast("Đã dọn sạch thùng rác.");
            },

            requestPermanentDeleteAll: () => {
                 const { permanentDeleteAll } = get();
                useUIStore.getState().showConfirmModal({
                    title: `Dọn sạch thùng rác?`,
                    text: `Tất cả các mục trong thùng rác sẽ bị xóa vĩnh viễn cùng với tiến trình liên quan. Hành động này không thể hoàn tác.`,
                    confirmText: 'Xóa vĩnh viễn',
                    onConfirm: () => permanentDeleteAll(),
                    isDestructive: true,
                });
            },

            autoCleanupTrash: () => {
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

                const state = get();
                const expiredPacks = state.studyPacks.filter(p => 
                    p.isDeleted && p.deletedAt && new Date(p.deletedAt) < thirtyDaysAgo
                );
                const expiredFolders = state.folders.filter(f => 
                    f.isDeleted && f.deletedAt && new Date(f.deletedAt) < thirtyDaysAgo
                );
                
                let deletedCount = 0;
                
                expiredPacks.forEach(pack => {
                    get().permanentDeleteItem(pack.id, 'pack');
                    deletedCount++;
                });
                expiredFolders.forEach(folder => {
                    get().permanentDeleteItem(folder.id, 'folder');
                    deletedCount++;
                });
                
                if (deletedCount > 0) {
                    useUIStore.getState().showToast(`Đã tự động xóa ${deletedCount} mục cũ khỏi thùng rác.`);
                }
            },
            
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
                        },
                    }));
                    useUIStore.getState().showToast(`Đã mua ${powerUpData.name}!`);
                } else {
                    useUIStore.getState().showToast('Không đủ Stetho Coins!');
                }
            },
            
            usePowerUp: (powerUpId) => {
                const state = get();
                const currentCount = state.inventory[powerUpId] || 0;
                if (currentCount > 0) {
                    set(s => ({
                        inventory: {
                            ...s.inventory,
                            [powerUpId]: currentCount - 1,
                        },
                    }));
                }
            },
            
            activatePowerUp: (powerUpId) => {
                const state = get();
                const currentCount = state.inventory[powerUpId] || 0;
                if (currentCount <= 0) {
                    useUIStore.getState().showToast('Bạn không có vật phẩm này!');
                    return;
                }
            
                set(s => ({
                    inventory: { ...s.inventory, [powerUpId]: currentCount - 1 }
                }));
            
                const powerUpData = POWER_UPS_DATA[powerUpId];
                useUIStore.getState().showToast(`✨ Đã kích hoạt ${powerUpData.name}!`);
            
                if (powerUpId === Types.PowerUpId.DOUBLE_XP || powerUpId === Types.PowerUpId.DOUBLE_COINS) {
                    const duration = 3600 * 1000; // 1 hour in ms
                    const expiresAt = Date.now() + duration;
                    set(s => ({
                        activeBoosts: {
                            ...s.activeBoosts,
                            [powerUpId]: { expiresAt }
                        }
                    }));
                } else if (powerUpId === Types.PowerUpId.STREAK_SHIELD) {
                    set({ isStreakShieldActive: true });
                }
            },

            buyTheme: (themeId) => {
                const themeData = THEMES_DATA[themeId];
                if (!themeData) return;
                const state = get();
                const ownedThemes = state.ownedThemes || [];
                if (ownedThemes.includes(themeId)) {
                    useUIStore.getState().showToast('Bạn đã sở hữu giao diện này!');
                    return;
                }

                if (state.stethoCoins >= themeData.price) {
                    set(s => ({
                        stethoCoins: s.stethoCoins - themeData.price,
                        ownedThemes: [...(s.ownedThemes || []), themeId],
                    }));
                    useUIStore.getState().showToast(`Đã mua giao diện ${themeData.name}!`);
                } else {
                    useUIStore.getState().showToast('Không đủ Stetho Coins!');
                }
            },

            setTheme: (themeId) => {
                const state = get();
                const ownedThemes = state.ownedThemes || [];
                if (ownedThemes.includes(themeId)) {
                    set({ activeTheme: themeId });
                } else {
                    useUIStore.getState().showToast('Bạn chưa sở hữu giao diện này!');
                }
            },
            
            refreshQuests: () => {
                const now = new Date();
                const today = now.toISOString().split('T')[0];
                const lastDailyRefresh = get().lastQuestRefresh.daily;
                const lastWeeklyRefresh = get().lastQuestRefresh.weekly;
                const needsDailyRefresh = today !== lastDailyRefresh;
                
                const nowDay = now.getDay(); // Sunday - 0, Monday - 1
                const lastWeeklyDate = new Date(lastWeeklyRefresh);
                const daysSinceLastWeekly = (now.getTime() - lastWeeklyDate.getTime()) / (1000 * 3600 * 24);
                const needsWeeklyRefresh = nowDay === 1 && daysSinceLastWeekly >= 1; // It's Monday and at least 1 day has passed
                
                if (!needsDailyRefresh && !needsWeeklyRefresh) return;
                
                set(state => {
                    const newQuests: Types.Quest[] = [];
                    let updatedDailyRefresh = lastDailyRefresh;
                    let updatedWeeklyRefresh = lastWeeklyRefresh;
                    
                    const dailyPool = QUEST_TEMPLATES[Types.QuestType.DAILY];
                    if (needsDailyRefresh) {
                        const shuffledDaily = dailyPool.sort(() => 0.5 - Math.random());
                        const selectedDaily = shuffledDaily.slice(0, 3);
                        newQuests.push(...selectedDaily.map(q => ({...q, progress: 0, claimed: false, type: Types.QuestType.DAILY })));
                        updatedDailyRefresh = today;
                    } else {
                        newQuests.push(...state.activeQuests.filter(q => q.type === Types.QuestType.DAILY));
                    }
                    
                    const weeklyPool = QUEST_TEMPLATES[Types.QuestType.WEEKLY];
                    if (needsWeeklyRefresh) {
                        const shuffledWeekly = weeklyPool.sort(() => 0.5 - Math.random());
                        const selectedWeekly = shuffledWeekly.slice(0, 2);
                        newQuests.push(...selectedWeekly.map(q => ({...q, progress: 0, claimed: false, type: Types.QuestType.WEEKLY })));
                        updatedWeeklyRefresh = today;
                    } else {
                        newQuests.push(...state.activeQuests.filter(q => q.type === Types.QuestType.WEEKLY));
                    }
                    
                    return {
                        activeQuests: newQuests,
                        lastQuestRefresh: { daily: updatedDailyRefresh, weekly: updatedWeeklyRefresh }
                    };
                });
            },
            
            claimQuestReward: (questId) => {
                 if (!get().isLoggedIn) {
                    useUIStore.getState().showToast("Vui lòng đăng nhập để nhận thưởng!");
                    return;
                }
                set(state => {
                    const quest = state.activeQuests.find(q => q.id === questId);
                    if (!quest || quest.claimed || quest.progress < quest.target) return state;

                    get().addXp(quest.xpReward);
                    get().addStethoCoins(quest.coinReward);

                    return {
                        activeQuests: state.activeQuests.map(q => q.id === questId ? { ...q, claimed: true } : q)
                    };
                });
            },

            updateQuestProgress: (category, value) => {
                set(state => {
                    let questsUpdated = false;
                    const updatedQuests = state.activeQuests.map(quest => {
                        if (quest.category === category && !quest.claimed) {
                            questsUpdated = true;
                            // FIX: For streak quests, set progress to the current streak value, don't add to it.
                            const newProgress = category === Types.QuestCategory.MAINTAIN_STREAK
                                ? value
                                : quest.progress + value;
                            return { ...quest, progress: newProgress };
                        }
                        return quest;
                    });
                    
                    if (questsUpdated) return { activeQuests: updatedQuests };
                    return state;
                });
            },

            claimTribute: () => {
                if (!get().isLoggedIn) {
                    useUIStore.getState().showToast("Vui lòng đăng nhập để nhận thưởng!");
                    return;
                }
                const isClaimed = get().tributeClaimed;
                if (!isClaimed) {
                    set(state => ({
                        stethoCoins: state.stethoCoins + 2000,
                        tributeClaimed: true,
                    }));
                    useUIStore.getState().showToast("✨ Đã nhận 2000 Stetho Coins tri ân!");
                }
            },
        }),
        {
            name: LOCAL_STORAGE_KEY,
            onRehydrateStorage: () => (state) => {
                if (state) {
                    state.isLoggedIn = state.name !== DEFAULT_USER_NAME;
                    state.isGenerating = false;
                    state.tutorState = 'closed';
                    state.tutorMessages = [];
                    state.isTutorLoading = false;
                }
            }
        }
    )
);