import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserData, StudyPack, BadgeId, QuizDifficulty, Folder, ChatMessage, QuizSession, LearningMode, SubmittedAnswer } from '../types';
import { BADGES_DATA, XP_ACTIONS, QUIZ_DIFFICULTY_POINTS, QUIZ_COMBO_BONUS, HOT_STREAK_THRESHOLD, INQUISITIVE_MIND_THRESHOLD, CONTENT_CURATOR_THRESHOLD, ARCHITECT_THRESHOLD, KNOWLEDGE_LIBRARY_THRESHOLD, INNOVATOR_THRESHOLD, AI_PARTNER_THRESHOLD, LIVING_LEGEND_THRESHOLD, XP_EARNER_1_THRESHOLD, STEEL_BRAIN_THRESHOLD, CONQUEROR_THRESHOLD, PACK_COLORS } from '../constants';
import { createStudyPack as createStudyPackService, askTutor, generateMoreQuestions as generateMoreQuestionsService } from '../services/geminiService';
import { useUIStore } from './useUIStore';
import { exportUserData } from '../utils/helpers';
import { ICON_MAP } from '../components/icons';

const LOCAL_STORAGE_KEY = 'smartMedTutorUserData';
const DEFAULT_USER_NAME = "Học viên Y khoa";

const initialUserData: UserData = {
    name: DEFAULT_USER_NAME,
    level: 1,
    xp: 0,
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
    tutorXpGainsToday: { count: 0, date: new Date(0).toISOString().split('T')[0], limitNotified: false },
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
    addXp: (amount: number, customMessage?: string) => void;
    checkAndAwardBadges: () => void;
    checkDailyStreak: () => void;
    handleActivity: () => void;
    createStudyPack: (source: { text?: string; file?: File | null }) => Promise<boolean>;
    updateStudyPack: (updatedPack: StudyPack) => void;
    recordLearningModeUsage: (packId: string, mode: LearningMode) => void;
    handleQuizAnswer: (packId: string, questionId: string, selectedAnswers: string[]) => void;
    handleQuizComplete: (pack: StudyPack, session: QuizSession) => void;
    generateMoreQuestions: (packId: string, customInstruction?: string) => Promise<void>;
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
}

const getDescendantIds = (folderId: string, allFolders: Folder[], allPacks: StudyPack[]) => {
    let descendantFolderIds: string[] = [];
    const findChildren = (parentId: string) => {
        const children = allFolders.filter(f => f.parentId === parentId);
        for (const child of children) {
            if (!child.isDeleted) {
                descendantFolderIds.push(child.id);
                findChildren(child.id);
            }
        }
    };
    findChildren(folderId);
    const packsInDescendants = allPacks.filter(p => [...descendantFolderIds, folderId].includes(p.folderId || '')).map(p => p.id);
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
            
            addXp: (amount, customMessage) => {
                const roundedAmount = Math.round(amount);
                if (roundedAmount > 0) {
                    set(state => ({ xp: state.xp + roundedAmount }));
                    useUIStore.getState().showToast(customMessage || `+${roundedAmount} XP!`);
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
                if (diffDays > 1 && get().lastActivityDate !== new Date(0).toISOString()) { set({ streak: 0 }); }
            },
            
            handleActivity: () => {
                const today = new Date(); today.setHours(0, 0, 0, 0);
                const lastActivity = new Date(get().lastActivityDate); lastActivity.setHours(0, 0, 0, 0);
                const diffDays = Math.round((today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
                
                if (diffDays === 1) {
                    const newStreak = get().streak + 1;
                    set({ streak: newStreak, lastActivityDate: new Date().toISOString() });
                    // Award XP bonus only for streaks of 2 days or more
                    if (newStreak >= 2) {
                        get().addXp(XP_ACTIONS.STREAK_BONUS);
                    }
                    useUIStore.getState().showToast(`🔥 Chuỗi ${newStreak} ngày!`);
                } else if (diffDays > 1) {
                    // Reset streak to 1, not 0, when a new activity starts after a gap
                    set({ streak: 1, lastActivityDate: new Date().toISOString() });
                    useUIStore.getState().showToast(`Chào mừng trở lại! Bắt đầu chuỗi mới!`);
                } else { 
                    // Handle first-ever activity or same-day activity
                    const isFirstEver = get().lastActivityDate === new Date(0).toISOString();
                    if (isFirstEver) {
                        // For the very first activity, start the streak at 1
                        set({ streak: 1, lastActivityDate: new Date().toISOString() });
                        useUIStore.getState().showToast(`🔥 Bắt đầu chuỗi mới!`);
                    } else {
                        // For subsequent activities on the same day, just update the timestamp
                        set({ lastActivityDate: new Date().toISOString() });
                    }
                }

                const currentHour = new Date().getHours();
                if (currentHour >= 22 && !get().unlockedBadges.includes(BadgeId.NIGHT_OWL)) set(prev => ({ unlockedBadges: [...prev.unlockedBadges, BadgeId.NIGHT_OWL] }));
                if (currentHour < 7 && !get().unlockedBadges.includes(BadgeId.EARLY_BIRD)) set(prev => ({ unlockedBadges: [...prev.unlockedBadges, BadgeId.EARLY_BIRD] }));
            },

            createStudyPack: async (source) => {
                set({ isGenerating: true });
                const { addXp, handleActivity } = get();
                try {
                    // Đơn giản hóa: Truyền thẳng đối tượng source (với File) đến service.
                    // Không cần chuyển đổi sang base64 ở đây nữa.
                    const generatedContent = await createStudyPackService(source);
                    
                    const packId = `pack_${Date.now()}`;

                    const randomColor = PACK_COLORS[Math.floor(Math.random() * PACK_COLORS.length)].key;
                    const availableIcons = Object.keys(ICON_MAP).filter(key => key !== 'default');
                    const randomIcon = availableIcons[Math.floor(Math.random() * availableIcons.length)];

                    const newPack: StudyPack = {
                        id: packId, imageUrl: '📚', progress: 0, ...generatedContent,
                        title: generatedContent.title || "Gói không tên", lesson: generatedContent.lesson || [],
                        quiz: (generatedContent.quiz || []).map((q, i) => ({ ...q, uniqueId: `${packId}_q_${i}` })),
                        originalQuizCount: (generatedContent.quiz || []).length,
                        fillInTheBlanks: generatedContent.fillInTheBlanks || [], glossary: generatedContent.glossary || [], folderId: null,
                        color: randomColor,
                        icon: randomIcon,
                        hasBeenCustomized: false,
                    };
                    set(state => ({ studyPacks: [...state.studyPacks, newPack] }));
                    addXp(XP_ACTIONS.CREATE_PACK);
                    handleActivity();
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
                        // Award XP only for the first customization of this specific pack
                        if (!oldPack.hasBeenCustomized) {
                            get().addXp(XP_ACTIONS.PERSONAL_TOUCH);
                            updatedPack.hasBeenCustomized = true; 
                        }
            
                        // Award badge for the very first customization across any pack
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
                
                let xpGained = 0;
                let toastMessage: string | null = null;
                
                if (isCorrect && !state.correctlyAnsweredQuizIds.includes(questionId)) {
                    let baseAmount = XP_ACTIONS.QUIZ_CORRECT_ANSWER + (QUIZ_DIFFICULTY_POINTS[question.difficulty as QuizDifficulty] || 0);
                    if (newComboCount > 1) {
                        baseAmount += QUIZ_COMBO_BONUS * (newComboCount - 1);
                    }
                    const streakMultiplier = state.streak > 1 ? 1 + (state.streak - 1) * 0.2 : 1;
                    xpGained = Math.round(baseAmount * streakMultiplier);
        
                    toastMessage = streakMultiplier > 1
                        ? `+${xpGained} XP! (Thưởng chuỗi x${streakMultiplier.toFixed(1)})`
                        : `+${xpGained} XP!`;
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
        
                    const updatedPacks = prev.studyPacks.map(p => {
                        if (p.id === packId) {
                            return { ...p, quizSession: newSession, progress: newProgress };
                        }
                        return p;
                    });
                    
                    return {
                        xp: prev.xp + xpGained,
                        correctlyAnsweredQuizIds: newCorrectlyAnsweredIds,
                        totalCorrectAnswers: newTotalCorrectAnswers,
                        studyPacks: updatedPacks
                    };
                });
        
                if (toastMessage) {
                    useUIStore.getState().showToast(toastMessage);
                }
                
                if (isCorrect && newComboCount >= HOT_STREAK_THRESHOLD && !get().unlockedBadges.includes(BadgeId.HOT_STREAK)) {
                    set(prev => ({ unlockedBadges: [...prev.unlockedBadges, BadgeId.HOT_STREAK] }));
                }
            },
            
            handleQuizComplete: (pack, session) => {
                const originalQuestionsCount = pack.originalQuizCount || pack.quiz.length;
                if (session.activeQuestionIds.length >= originalQuestionsCount) get().handleActivity();

                const score = Object.values(session.submittedAnswers).filter((a: unknown) => (a as SubmittedAnswer).isCorrect).length;
                const isPerfect = score === session.activeQuestionIds.length && session.activeQuestionIds.length > 0;
                
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

            generateMoreQuestions: async (packId, customInstruction) => {
                const pack = get().studyPacks.find(p => p.id === packId);
                if (!pack) return;
                set({ isGenerating: true });
                try {
                    const lessonContext = pack.lesson.map(l => l.content).join('\n');
                    const newQuestions = await generateMoreQuestionsService(lessonContext, pack.quiz, customInstruction);
                    const newMCQs = newQuestions.map((q, i) => ({ ...q, uniqueId: `${packId}_gen_${Date.now()}_${i}` }));
                    
                    const allQuestions = [...pack.quiz, ...newMCQs];
                    
                    const newSession: QuizSession = {
                        currentQuestionIndex: 0,
                        comboCount: 0,
                        submittedAnswers: {},
                        incorrectlyAnsweredIds: [],
                        activeQuestionIds: allQuestions.map(q => q.uniqueId),
                    };
                    
                    const updatedPack = { ...pack, quiz: allQuestions, quizSession: newSession };
                    
                    get().updateStudyPack(updatedPack);
                    set(prev => ({ generatedQuestionCount: prev.generatedQuestionCount + newMCQs.length }));
                    useUIStore.getState().showToast(`Đã tạo thêm ${newMCQs.length} câu hỏi mới!`);
                } catch (error) { 
                    useUIStore.getState().showToast('Không thể tạo thêm câu hỏi.');
                } finally { 
                    set({ isGenerating: false });
                }
            },
            
            // Tutor
            openTutor: (greeting) => {
                if (get().tutorState === 'closed') {
                    set({ tutorMessages: [{ sender: 'ai', text: greeting || "Chào bạn! Tôi có thể giúp gì?" }] });
                }
                set({ tutorState: 'open' });
            },
            closeTutor: () => set({ tutorState: 'closed', tutorMessages: [], tutorContext: undefined }),
            minimizeTutor: () => set({ tutorState: 'minimized' }),
            toggleTutorSize: () => set(state => ({
                tutorState: state.tutorState === 'open' ? 'maximized' : 'open'
            })),
            sendMessageToTutor: async (message) => {
                const { addXp, handleActivity, tutorContext } = get();
                set(prev => ({ tutorMessages: [...prev.tutorMessages, { sender: 'user', text: message }], isTutorLoading: true }));
                set(prev => ({ questionsAskedCount: prev.questionsAskedCount + 1 }));

                // --- XP Limit Logic ---
                const todayStr = new Date().toISOString().split('T')[0];
                const tutorGains = get().tutorXpGainsToday;

                if (!tutorGains || tutorGains.date !== todayStr) {
                    set({ tutorXpGainsToday: { count: 1, date: todayStr, limitNotified: false } });
                    addXp(XP_ACTIONS.ASK_AI);
                } else if (tutorGains.count < 5) {
                    set(prev => ({ tutorXpGainsToday: { ...prev.tutorXpGainsToday!, count: prev.tutorXpGainsToday!.count + 1 } }));
                    addXp(XP_ACTIONS.ASK_AI);
                } else {
                    if (!tutorGains.limitNotified) {
                        useUIStore.getState().showToast("Bạn đã đạt giới hạn XP từ Gia sư AI cho hôm nay.");
                        set(prev => ({ tutorXpGainsToday: { ...prev.tutorXpGainsToday!, limitNotified: true } }));
                    }
                }

                handleActivity();
                
                try {
                    const activePack = get().studyPacks.find(p => p.id === get().tutorContext?.split('_pack_')[0]);
                    const lessonContext = activePack ? activePack.lesson.map(l => l.content).join('\n') : "Không có bối cảnh bài học cụ thể.";
                    const responseText = await askTutor(lessonContext, message, tutorContext);
                    set(prev => ({ tutorMessages: [...prev.tutorMessages, { sender: 'ai', text: responseText }] }));
                } catch (error) { set(prev => ({ tutorMessages: [...prev.tutorMessages, { sender: 'ai', text: "Xin lỗi, tôi gặp sự cố." }] })); }
                finally { set({ isTutorLoading: false, tutorContext: undefined }); }
            },
            setTutorContextAndOpen: (context, greeting) => {
                set({ tutorContext: context });
                get().openTutor(greeting);
            },
            clearTutorContext: () => set({ tutorContext: undefined }),
            
            // File Management
            createFolder: (parentId) => set(state => ({ folders: [...state.folders, { id: `folder_${Date.now()}`, name: 'Thư mục không tên', parentId }]})),
            updateFolder: (id, newName, newIcon) => set(state => ({ folders: state.folders.map(f => f.id === id ? { ...f, name: newName, icon: newIcon } : f) })),
            movePacksToFolder: (packIds, folderId) => set(state => ({ studyPacks: state.studyPacks.map(p => packIds.includes(p.id) ? { ...p, folderId } : p) })),
            
            softDeleteItem: (id, type) => {
                if (type === 'pack') {
                    set(prev => ({ studyPacks: prev.studyPacks.map(p => p.id === id ? { ...p, isDeleted: true } : p) }));
                } else {
                    const { folderIds, packIds } = getDescendantIds(id, get().folders, get().studyPacks);
                    const allFolderIds = [id, ...folderIds];
                    set(prev => ({
                        folders: prev.folders.map(f => allFolderIds.includes(f.id) ? { ...f, isDeleted: true } : f),
                        studyPacks: prev.studyPacks.map(p => packIds.includes(p.id) ? { ...p, isDeleted: true } : p)
                    }));
                }
            },
            requestSoftDelete: (id, type) => useUIStore.getState().showConfirmModal({
                title: `Xóa ${type === 'folder' ? 'thư mục' : 'gói học tập'}?`,
                text: "Thao tác này sẽ chuyển mục này và tất cả nội dung bên trong vào thùng rác. Bạn có thể khôi phục lại sau.",
                confirmText: "Chuyển vào thùng rác",
                onConfirm: () => get().softDeleteItem(id, type),
                isDestructive: true,
            }),

            restoreItem: (id, type) => {
                if (type === 'pack') {
                    set(prev => ({ studyPacks: prev.studyPacks.map(p => p.id === id ? { ...p, isDeleted: false } : p) }));
                } else {
                    const folder = get().folders.find(f => f.id === id);
                    const parentId = folder?.parentId;
                    const { folderIds, packIds } = getDescendantIds(id, get().folders, get().studyPacks);
                    const allFolderIds = [id, ...folderIds];
                    set(prev => ({
                        folders: prev.folders.map(f => (allFolderIds.includes(f.id) || (f.id === parentId && f.isDeleted)) ? { ...f, isDeleted: false } : f),
                        studyPacks: prev.studyPacks.map(p => packIds.includes(p.id) ? { ...p, isDeleted: false } : p)
                    }));
                }
            },

            permanentDeleteItem: (id, type) => {
                if (type === 'pack') {
                    set(prev => ({ studyPacks: prev.studyPacks.filter(p => p.id !== id) }));
                } else {
                    const { folderIds, packIds } = getDescendantIds(id, get().folders, get().studyPacks);
                    const allFolderIds = [id, ...folderIds];
                    set(prev => ({
                        folders: prev.folders.filter(f => !allFolderIds.includes(f.id)),
                        studyPacks: prev.studyPacks.filter(p => !packIds.includes(p.id))
                    }));
                }
            },
            requestPermanentDelete: (id, type) => useUIStore.getState().showConfirmModal({
                title: `Xóa vĩnh viễn ${type === 'folder' ? 'thư mục' : 'gói học tập'}?`,
                text: "Hành động này không thể được hoàn tác.",
                confirmText: "Xóa vĩnh viễn",
                onConfirm: () => get().permanentDeleteItem(id, type),
                isDestructive: true,
            }),

            restoreAll: () => set(prev => ({
                studyPacks: prev.studyPacks.map(p => ({ ...p, isDeleted: false })),
                folders: prev.folders.map(f => ({ ...f, isDeleted: false })),
            })),
            
            permanentDeleteAll: () => set(prev => ({
                studyPacks: prev.studyPacks.filter(p => !p.isDeleted),
                folders: prev.folders.filter(f => !f.isDeleted),
            })),
            requestPermanentDeleteAll: () => useUIStore.getState().showConfirmModal({
                title: "Xóa vĩnh viễn tất cả?",
                text: "Hành động này sẽ xóa vĩnh viễn tất cả các mục trong thùng rác.",
                confirmText: "Xóa vĩnh viễn",
                onConfirm: get().permanentDeleteAll,
                isDestructive: true,
            }),
        }),
        {
            name: LOCAL_STORAGE_KEY,
            onRehydrateStorage: () => (state) => {
                if (state) {
                    state.isLoggedIn = state.name !== DEFAULT_USER_NAME;
                }
            }
        }
    )
);