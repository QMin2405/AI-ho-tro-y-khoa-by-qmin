import type { ReactElement } from 'react';

export enum LearningMode {
    SUMMARY = "Summary",
    QUIZ = "Quiz",
    FILL_IN_THE_BLANK = "Fill-in-the-Blank",
    GLOSSARY = "Glossary",
    TUTOR = "Tutor",
    TIPS = "Tips",
    CONCISE_SUMMARY = "ConciseSummary",
    M2_STAATEXAM = "Trắc nghiệm M2 staatexam",
}

export interface SummaryContent {
    type: 'heading' | 'paragraph' | 'tip' | 'warning' | 'example' | 'table';
    content: string;
    tableData?: {
        headers: string[];
        rows: string[][];
    };
}

export enum QuizDifficulty {
    EASY = 'Easy',
    MEDIUM = 'Medium',
    HARD = 'Hard'
}

export interface MCQ {
    uniqueId: string;
    question: string;
    options: string[];
    correctAnswers: string[];
    type: 'single-choice' | 'multiple-choice';
    explanation: string;
    difficulty: QuizDifficulty;
}

export interface FillInTheBlank {
    sentence: string; // "The powerhouse of the cell is the ____."
    answer: string; // "mitochondria"
}

export interface GlossaryItem {
    english: string;
    german: string;
    vietnamese: string;
    definition: string;
}

export interface SubmittedAnswer {
    selectedAnswers: string[];
    isCorrect: boolean;
}

export interface QuizSession {
    currentQuestionIndex: number;
    comboCount: number;
    submittedAnswers: Record<string, SubmittedAnswer>; // key is question uniqueId
    incorrectlyAnsweredIds: string[];
    activeQuestionIds: string[]; // To track the current set of questions (all vs. incorrect)
}

export interface Folder {
    id: string;
    name: string;
    isDeleted?: boolean;
    deletedAt?: string;
    icon?: string;
    parentId?: string | null;
}

export interface StudyPack {
    id: string;
    title: string;
    imageUrl: string;
    progress: number;
    lesson: SummaryContent[];
    conciseSummary?: string;
    quiz: MCQ[];
    m2StaatexamQuiz?: MCQ[];
    originalQuizCount?: number;
    fillInTheBlanks: FillInTheBlank[];
    glossary: GlossaryItem[];
    quizSession?: QuizSession;
    m2StaatexamQuizSession?: QuizSession;
    folderId?: string | null;
    isDeleted?: boolean;
    deletedAt?: string;
    color?: string;
    icon?: string;
    usedLearningModes?: LearningMode[];
    hasBeenCustomized?: boolean;
}

export enum BadgeId {
    // Getting Started
    FIRST_PACK = 'FIRST_PACK',
    FIRST_QUIZ = 'FIRST_QUIZ',
    INQUISITIVE_MIND = 'INQUISITIVE_MIND',
    HOLISTIC_LEARNER = 'HOLISTIC_LEARNER', 

    // Consistency
    PERFECT_WEEK = 'PERFECT_WEEK',
    STREAK_30_DAYS = 'STREAK_30_DAYS',
    
    // Mastery & Dedication
    FLAWLESS_VICTORY = 'FLAWLESS_VICTORY',
    HOT_STREAK = 'HOT_STREAK',
    CONTENT_CURATOR = 'CONTENT_CURATOR',
    SUBJECT_MATTER_EXPERT = 'SUBJECT_MATTER_EXPERT',
    STEEL_BRAIN = 'STEEL_BRAIN',
    THE_CONQUEROR = 'THE_CONQUEROR',
    
    // Level & XP Milestones
    LEVEL_5_REACHED = 'LEVEL_5_REACHED',
    LEVEL_10_REACHED = 'LEVEL_10_REACHED',
    XP_EARNER_1 = 'XP_EARNER_1',
    THE_MASTER = 'THE_MASTER',
    LIVING_LEGEND = 'LIVING_LEGEND',

    // Creation & Engagement
    THE_ARCHITECT = 'THE_ARCHITECT',
    KNOWLEDGE_LIBRARY = 'KNOWLEDGE_LIBRARY',
    THE_INNOVATOR = 'THE_INNOVATOR',
    PERSONAL_TOUCH = 'PERSONAL_TOUCH',
    AI_PARTNER = 'AI_PARTNER',

    // Habits
    NIGHT_OWL = 'NIGHT_OWL',
    EARLY_BIRD = 'EARLY_BIRD',
}


export interface Badge {
    id: BadgeId;
    name: string;
    description: string;
    icon: ReactElement<{ className?: string }>;
}

export interface ChatMessage {
    sender: 'user' | 'ai';
    text: string;
}

export enum PowerUpId {
    DOUBLE_XP = 'DOUBLE_XP',
    DOUBLE_COINS = 'DOUBLE_COINS',
    STREAK_SHIELD = 'STREAK_SHIELD',
    REMOVE_ONE_WRONG = 'REMOVE_ONE_WRONG',
    FIFTY_FIFTY = 'FIFTY_FIFTY',
}

export interface PowerUp {
    id: PowerUpId;
    name: string;
    description: string;
    price: number;
    icon: ReactElement<{ className?: string }>;
}

export enum QuestType {
    DAILY = 'DAILY',
    WEEKLY = 'WEEKLY'
}

export enum QuestCategory {
    CREATE_PACK = 'CREATE_PACK',
    ANSWER_CORRECTLY = 'ANSWER_CORRECTLY',
    EARN_XP = 'EARN_XP',
    MAINTAIN_STREAK = 'MAINTAIN_STREAK',
    COMPLETE_QUIZ = 'COMPLETE_QUIZ',
}

export interface Quest {
    id: string;
    type: QuestType;
    category: QuestCategory;
    description: string;
    target: number;
    xpReward: number;
    coinReward: number;
    progress: number;
    claimed: boolean;
}

export interface UserData {
    name: string;
    level: number;
    xp: number;
    stethoCoins: number;
    streak: number;
    unlockedBadges: BadgeId[];
    studyPacks: StudyPack[];
    folders: Folder[];
    correctlyAnsweredQuizIds: string[];
    lastActivityDate: string; 
    questionsAskedCount: number;
    generatedQuestionCount: number;
    totalCorrectAnswers: number;
    perfectQuizCompletions: number;
    tutorXpGainsToday?: { 
        count: number;
        date: string; 
        limitNotified?: boolean;
    };
    inventory: Partial<Record<PowerUpId, number>>;
    activeQuests: Quest[];
    lastQuestRefresh: {
        daily: string;
        weekly: string;
    };
    tributeClaimed?: boolean;
    activeBoosts?: Partial<Record<'DOUBLE_XP' | 'DOUBLE_COINS', { expiresAt: number }>>;
    isStreakShieldActive?: boolean;
}