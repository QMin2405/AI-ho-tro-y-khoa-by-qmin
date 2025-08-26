import React from 'react';
import type { Badge, PowerUp, Theme } from './types';
import { BadgeId, PowerUpId, QuestType, QuestCategory, ThemeId } from './types';
import { 
    BookOpenIcon, 
    ClipboardListIcon, 
    FireIcon, 
    SparklesIcon,
    ChatAlt2Icon,
    TrophyIcon,
    CalendarDaysIcon,
    RocketLaunchIcon,
    CrownIcon,
    CubeTransparentIcon,
    BanknotesIcon,
    AcademicCapIcon,
    GlobeAltIcon,
    CpuChipIcon,
    ShieldCheckIcon,
    BuildingLibraryIcon,
    LightBulbIcon,
    FingerPrintIcon,
    UsersIcon,
    ClockIcon,
    StarIcon,
    BoltIcon,
    MoonIcon,
    SunIcon,
    ScaleIcon,
    MinusCircleIcon,
} from './components/icons';

const badgeIconProps = { className: "w-full h-full" };

export const BADGES_DATA: Record<BadgeId, Omit<Badge, 'id'>> = {
    // --- Getting Started ---
    [BadgeId.FIRST_PACK]: { name: 'Nhà Thám Hiểm', description: 'Tạo Gói học tập đầu tiên của bạn.', icon: React.createElement(BookOpenIcon, badgeIconProps) },
    [BadgeId.FIRST_QUIZ]: { name: 'Phát Súng Đầu Tiên', description: 'Hoàn thành bài trắc nghiệm đầu tiên.', icon: React.createElement(ClipboardListIcon, badgeIconProps) },
    [BadgeId.INQUISITIVE_MIND]: { name: 'Trí Óc Tò Mò', description: `Hỏi Gia sư AI ${50} câu hỏi.`, icon: React.createElement(ChatAlt2Icon, badgeIconProps) },
    [BadgeId.HOLISTIC_LEARNER]: { name: 'Người Học Toàn Diện', description: 'Sử dụng tất cả các chế độ học trong một gói.', icon: React.createElement(SparklesIcon, badgeIconProps) },

    // --- Consistency ---
    [BadgeId.PERFECT_WEEK]: { name: 'Tuần Lễ Hoàn Hảo', description: 'Duy trì chuỗi học 7 ngày.', icon: React.createElement(CalendarDaysIcon, badgeIconProps) },
    [BadgeId.STREAK_30_DAYS]: { name: 'Ngọn Lửa Bất Diệt', description: 'Duy trì chuỗi học 30 ngày.', icon: React.createElement(FireIcon, badgeIconProps) },
    
    // --- Mastery & Dedication ---
    [BadgeId.FLAWLESS_VICTORY]: { name: 'Chiến Thắng Hoàn Hảo', description: 'Đạt điểm tuyệt đối trong một bài trắc nghiệm khó.', icon: React.createElement(TrophyIcon, badgeIconProps) },
    [BadgeId.HOT_STREAK]: { name: 'Chuỗi Nóng', description: `Đạt chuỗi combo ${10} trong một bài trắc nghiệm.`, icon: React.createElement(RocketLaunchIcon, badgeIconProps) },
    [BadgeId.SUBJECT_MATTER_EXPERT]: { name: 'Chuyên Gia Chủ Đề', description: 'Đạt 100% tiến độ trong một Gói học tập.', icon: React.createElement(GlobeAltIcon, badgeIconProps) },
    [BadgeId.STEEL_BRAIN]: { name: 'Bộ Não Thép', description: `Trả lời đúng ${500} câu hỏi trắc nghiệm.`, icon: React.createElement(CpuChipIcon, badgeIconProps) },
    [BadgeId.THE_CONQUEROR]: { name: 'Người Chinh Phục', description: `Đạt điểm tuyệt đối trong ${10} bài trắc nghiệm khác nhau.`, icon: React.createElement(ShieldCheckIcon, badgeIconProps) },
    
    // --- Level & XP Milestones ---
    [BadgeId.LEVEL_5_REACHED]: { name: 'Bác sĩ Nội trú', description: 'Đạt Cấp 5.', icon: React.createElement(AcademicCapIcon, badgeIconProps) },
    [BadgeId.LEVEL_10_REACHED]: { name: 'Bác sĩ Tư vấn', description: 'Đạt Cấp 10.', icon: React.createElement(CrownIcon, badgeIconProps) },
    [BadgeId.XP_EARNER_1]: { name: 'Người Tích Lũy', description: `Kiếm được ${25000} XP.`, icon: React.createElement(BanknotesIcon, badgeIconProps) },
    [BadgeId.THE_MASTER]: { name: 'Bậc Thầy', description: 'Đạt Cấp 15 (Bậc thầy lâm sàng).', icon: React.createElement(StarIcon, badgeIconProps) },
    [BadgeId.LIVING_LEGEND]: { name: 'Huyền Thoại Sống', description: `Kiếm được ${100000} XP.`, icon: React.createElement(BoltIcon, badgeIconProps) },

    // --- Creation & Engagement ---
    [BadgeId.THE_ARCHITECT]: { name: 'Nhà Kiến Tạo', description: `Tạo ${3} Gói học tập.`, icon: React.createElement(CubeTransparentIcon, badgeIconProps) },
    [BadgeId.CONTENT_CURATOR]: { name: 'Người Quản lý Nội dung', description: `Tạo ${10} Gói học tập.`, icon: React.createElement(CubeTransparentIcon, badgeIconProps) },
    [BadgeId.KNOWLEDGE_LIBRARY]: { name: 'Thư Viện Tri Thức', description: `Tạo ${25} Gói học tập.`, icon: React.createElement(BuildingLibraryIcon, badgeIconProps) },
    [BadgeId.THE_INNOVATOR]: { name: 'Nhà Cải Tiến', description: `Tạo thêm ${50} câu hỏi trắc nghiệm.`, icon: React.createElement(LightBulbIcon, badgeIconProps) },
    [BadgeId.PERSONAL_TOUCH]: { name: 'Dấu Ấn Cá Nhân', description: 'Tùy chỉnh giao diện của một Gói học tập.', icon: React.createElement(FingerPrintIcon, badgeIconProps) },
    [BadgeId.AI_PARTNER]: { name: 'Đối Tác AI', description: `Hỏi Gia sư AI ${250} câu hỏi.`, icon: React.createElement(UsersIcon, badgeIconProps) },

    // --- Habits ---
    [BadgeId.NIGHT_OWL]: { name: 'Cú Đêm', description: 'Hoàn thành một buổi học sau 10 giờ tối.', icon: React.createElement(MoonIcon, badgeIconProps) },
    [BadgeId.EARLY_BIRD]: { name: 'Chào Buổi Sáng', description: 'Hoàn thành một buổi học trước 7 giờ sáng.', icon: React.createElement(SunIcon, badgeIconProps) },
};

// --- Badge Thresholds ---
export const INQUISITIVE_MIND_THRESHOLD = 50;
export const CONTENT_CURATOR_THRESHOLD = 10;
export const HOT_STREAK_THRESHOLD = 10;
export const XP_EARNER_1_THRESHOLD = 25000;
export const STEEL_BRAIN_THRESHOLD = 500;
export const CONQUEROR_THRESHOLD = 10;
export const ARCHITECT_THRESHOLD = 3;
export const KNOWLEDGE_LIBRARY_THRESHOLD = 25;
export const INNOVATOR_THRESHOLD = 50;
export const AI_PARTNER_THRESHOLD = 250;
export const LIVING_LEGEND_THRESHOLD = 100000;


export const LEVEL_THRESHOLDS: number[] = [
    0, 1000, 2500, 5000, 8000, 12000, 17000, 23000, 30000, 40000, 50000, 65000, 80000, 100000, 125000, 150000
];

export const LEVEL_NAMES: string[] = [
    'Sinh viên Y1',
    'Sinh viên Y2',
    'Sinh viên Y3',
    'Sinh viên Y4',
    'Sinh viên Y5',
    'Sinh viên Y6',
    'Bác sĩ nội trú',
    'Thạc sĩ',
    'Bác sĩ chuyên khoa I',
    'Tiến sĩ',
    'Bác sĩ chuyên khoa II',
    'Giáo sư',
];

export const XP_ACTIONS = {
    CREATE_PACK: 250,
    QUIZ_100_PERCENT: 150,
    QUIZ_CORRECT_ANSWER: 10,
    ASK_AI: 25,
    STREAK_BONUS: 50,
    PERSONAL_TOUCH: 20,
};

export const COIN_ACTIONS = {
    QUIZ_CORRECT_EASY: 10,
    QUIZ_CORRECT_MEDIUM: 20,
    QUIZ_CORRECT_HARD: 30,
    PACK_COMPLETE: 200,
    LEVEL_UP_MULTIPLIER: 250,
    STREAK_DAILY: 50,
    STREAK_MILESTONE_7: 250,
    STREAK_MILESTONE_14: 500,
    STREAK_DAILY_INCREASE: 75,
};

export const QUIZ_DIFFICULTY_POINTS = {
    Easy: 30,
    Medium: 60,
    Hard: 90,
};

export const QUIZ_COMBO_BONUS = 15;

export const STREAK_MILESTONES = [
    { days: 1, name: 'Tia Lửa Đầu Tiên' },
    { days: 3, name: 'Ngọn Lửa Bùng Cháy' },
    { days: 7, name: 'Ngọn Lửa Bền Bỉ' },
    { days: 15, name: 'Ngọn Lửa Rực Rỡ' },
    { days: 30, name: 'Ngọn Lửa Bất Diệt' },
    { days: 45, name: 'Ngọn Lửa Quyết Tâm' },
    { days: 60, name: 'Lửa Phượng Hoàng' },
    { days: 75, name: 'Lửa Thử Vàng' },
    { days: 100, name: 'Linh Hồn Rực Cháy' },
    { days: 150, name: 'Siêu Tân Tinh' },
    { days: 200, name: 'Tinh Vân Rực Lửa' },
    { days: 250, name: 'Vầng Hào Quang Rực Rỡ' },
    { days: 300, name: 'Tinh Thần Thép' },
    { days: 365, name: 'Thiên Hà Bất Tử' },
    { days: 500, name: 'Di Sản Bất Diệt' },
    { days: 600, name: 'Huyền Thoại Y Khoa' },
    { days: 730, name: 'Vì Sao Dẫn Lối' },
];

export const PACK_COLORS = [
  { key: 'slate', bg: 'bg-slate-200 dark:bg-gray-700', text: 'text-slate-800 dark:text-slate-200' },
  { key: 'sky', bg: 'bg-sky-200 dark:bg-sky-900/60', text: 'text-sky-800 dark:text-sky-200' },
  { key: 'rose', bg: 'bg-rose-200 dark:bg-rose-900/60', text: 'text-rose-800 dark:text-rose-200' },
  { key: 'emerald', bg: 'bg-emerald-200 dark:bg-emerald-900/60', text: 'text-emerald-800 dark:text-emerald-200' },
  { key: 'violet', bg: 'bg-violet-200 dark:bg-violet-900/60', text: 'text-violet-800 dark:text-violet-200' },
  { key: 'amber', bg: 'bg-amber-200 dark:bg-amber-900/60', text: 'text-amber-800 dark:text-amber-200' },
];

export const POWER_UPS_DATA: Record<PowerUpId, Omit<PowerUp, 'id'>> = {
    [PowerUpId.DOUBLE_XP]: {
        name: 'Nhân đôi XP (1 giờ)',
        description: 'Tăng gấp đôi lượng XP bạn nhận được trong 1 giờ tiếp theo.',
        price: 500,
        icon: React.createElement(BoltIcon, { className: 'w-8 h-8' }),
    },
    [PowerUpId.DOUBLE_COINS]: {
        name: 'Nhân đôi Coin (1 giờ)',
        description: 'Tăng gấp đôi lượng Stetho Coins bạn kiếm được trong 1 giờ tiếp theo.',
        price: 750,
        icon: React.createElement(BanknotesIcon, { className: 'w-8 h-8' }),
    },
    [PowerUpId.STREAK_SHIELD]: {
        name: 'Khiên Bảo vệ Chuỗi',
        description: 'Bảo vệ chuỗi học tập của bạn khỏi bị mất trong một ngày.',
        price: 1000,
        icon: React.createElement(ShieldCheckIcon, { className: 'w-8 h-8' }),
    },
    [PowerUpId.REMOVE_ONE_WRONG]: {
        name: 'Loại bỏ 1 đáp án sai',
        description: 'Loại bỏ một phương án sai trong một câu hỏi trắc nghiệm.',
        price: 200,
        icon: React.createElement(MinusCircleIcon, { className: 'w-8 h-8' }),
    },
    [PowerUpId.FIFTY_FIFTY]: {
        name: 'Hỗ trợ 50:50',
        description: 'Loại bỏ hai phương án sai trong một câu hỏi trắc nghiệm.',
        price: 350,
        icon: React.createElement(ScaleIcon, { className: 'w-8 h-8' }),
    },
};

export const QUEST_TEMPLATES = {
    [QuestType.DAILY]: [
        { id: 'd_answer_15', category: QuestCategory.ANSWER_CORRECTLY, description: 'Trả lời đúng 15 câu hỏi', target: 15, xpReward: 75, coinReward: 50 },
        { id: 'd_answer_30', category: QuestCategory.ANSWER_CORRECTLY, description: 'Trả lời đúng 30 câu hỏi', target: 30, xpReward: 150, coinReward: 100 },
        { id: 'd_earn_xp_500', category: QuestCategory.EARN_XP, description: 'Kiếm được 500 XP', target: 500, xpReward: 100, coinReward: 75 },
        { id: 'd_create_pack_1', category: QuestCategory.CREATE_PACK, description: 'Tạo 1 Gói học tập mới', target: 1, xpReward: 200, coinReward: 100 },
        { id: 'd_complete_quiz_1', category: QuestCategory.COMPLETE_QUIZ, description: 'Hoàn thành 1 bài trắc nghiệm', target: 1, xpReward: 100, coinReward: 50 },
    ],
    [QuestType.WEEKLY]: [
        { id: 'w_answer_100', category: QuestCategory.ANSWER_CORRECTLY, description: 'Trả lời đúng 100 câu hỏi', target: 100, xpReward: 500, coinReward: 300 },
        { id: 'w_create_pack_3', category: QuestCategory.CREATE_PACK, description: 'Tạo 3 Gói học tập mới', target: 3, xpReward: 600, coinReward: 400 },
        { id: 'w_earn_xp_2500', category: QuestCategory.EARN_XP, description: 'Kiếm được 2500 XP', target: 2500, xpReward: 400, coinReward: 250 },
        { id: 'w_maintain_streak_7', category: QuestCategory.MAINTAIN_STREAK, description: 'Duy trì chuỗi học 7 ngày', target: 7, xpReward: 750, coinReward: 500 },
        { id: 'w_complete_quiz_5', category: QuestCategory.COMPLETE_QUIZ, description: 'Hoàn thành 5 bài trắc nghiệm', target: 5, xpReward: 400, coinReward: 200 },
    ]
};

export const THEMES_DATA: Record<ThemeId, Omit<Theme, 'id'>> = {
    [ThemeId.DEFAULT]: {
        name: 'Giao diện Mặc định',
        price: 0,
        previewColors: ['#f1f5f9', '#0f172a', '#3b82f6', '#64748b'],
        lightColors: {
            '--color-background': '#f1f5f9',
            '--color-foreground': '#ffffff',
            '--color-text-primary': '#1e293b',
            '--color-text-secondary': '#64748b',
            '--color-border': '#e2e8f0',
            '--color-brand-primary': '#1d4ed8',
            '--color-brand-secondary': '#3b82f6',
        },
        darkColors: {
            '--color-background': '#0f172a',
            '--color-foreground': '#1e293b',
            '--color-text-primary': '#e2e8f0',
            '--color-text-secondary': '#94a3b8',
            '--color-border': '#334155',
            '--color-brand-primary': '#3b82f6',
            '--color-brand-secondary': '#60a5fa',
        }
    },
    [ThemeId.DEEP_OCEAN]: {
        name: 'Xanh Biển Sâu',
        price: 1500,
        previewColors: ['#f0f2f5', '#0d1b2a', '#778da9', '#00b4d8'],
        lightColors: {
            '--color-background': '#f0f2f5',
            '--color-foreground': '#ffffff',
            '--color-text-primary': '#1b263b',
            '--color-text-secondary': '#415a77',
            '--color-border': '#cad1d9',
            '--color-brand-primary': '#0096c7',
            '--color-brand-secondary': '#48cae4',
        },
        darkColors: {
            '--color-background': '#0d1b2a',
            '--color-foreground': '#1b263b',
            '--color-text-primary': '#e0e1dd',
            '--color-text-secondary': '#778da9',
            '--color-border': '#415a77',
            '--color-brand-primary': '#00b4d8',
            '--color-brand-secondary': '#90e0ef',
        }
    },
    [ThemeId.CHERRY_BLOSSOM]: {
        name: 'Hoa Anh Đào',
        price: 2000,
        previewColors: ['#fff0f3', '#2b2123', '#ffb3c1', '#ff8fab'],
        lightColors: {
            '--color-background': '#fff0f3',
            '--color-foreground': '#ffffff',
            '--color-text-primary': '#59484b',
            '--color-text-secondary': '#8c7b7d',
            '--color-border': '#ffe5e9',
            '--color-brand-primary': '#ff8fab',
            '--color-brand-secondary': '#ffb3c1',
        },
        darkColors: {
            '--color-background': '#2b2123',
            '--color-foreground': '#403235',
            '--color-text-primary': '#ffe5e9',
            '--color-text-secondary': '#bfaab0',
            '--color-border': '#59484b',
            '--color-brand-primary': '#ff8fab',
            '--color-brand-secondary': '#ffb3c1',
        }
    },
    [ThemeId.SYNTHWAVE]: {
        name: 'Synthwave',
        price: 2500,
        previewColors: ['#f0f0f0', '#1a103c', '#ff00ff', '#00ffff'],
        lightColors: {
            '--color-background': '#f0f0f0',
            '--color-foreground': '#ffffff',
            '--color-text-primary': '#2c1e5c',
            '--color-text-secondary': '#4a3d8f',
            '--color-border': '#d9d5e5',
            '--color-brand-primary': '#e600e6',
            '--color-brand-secondary': '#00e6e6',
        },
        darkColors: {
            '--color-background': '#1a103c',
            '--color-foreground': '#2c1e5c',
            '--color-text-primary': '#f0f0f0',
            '--color-text-secondary': '#a097c1',
            '--color-border': '#4a3d8f',
            '--color-brand-primary': '#ff00ff',
            '--color-brand-secondary': '#00ffff',
        }
    },
    [ThemeId.HOPEFUL_SEA]: {
        name: 'Biển xanh hy vọng',
        price: 2800,
        previewColors: ['#2980B9', '#6DD5FA'],
        lightColors: {
            '--color-background': '#f0f8ff',
            '--color-foreground': '#ffffff',
            '--color-text-primary': '#1d5a82',
            '--color-text-secondary': '#5c8ca7',
            '--color-border': '#cde4f0',
            '--color-brand-primary': '#2980B9',
            '--color-brand-secondary': '#6DD5FA',
        },
        darkColors: {
            '--color-background': '#0a192f',
            '--color-foreground': '#112240',
            '--color-text-primary': '#ccd6f6',
            '--color-text-secondary': '#8892b0',
            '--color-border': '#233554',
            '--color-brand-primary': '#6DD5FA',
            '--color-brand-secondary': '#2980B9',
        }
    },
    [ThemeId.FRESH_MEADOW]: {
        name: 'Đồng cỏ xanh mát',
        price: 2800,
        previewColors: ['#A8E063', '#56AB2F'],
        lightColors: {
            '--color-background': '#f5fff0',
            '--color-foreground': '#ffffff',
            '--color-text-primary': '#38701e',
            '--color-text-secondary': '#6a8a5b',
            '--color-border': '#dbe6d5',
            '--color-brand-primary': '#56AB2F',
            '--color-brand-secondary': '#A8E063',
        },
        darkColors: {
            '--color-background': '#102a12',
            '--color-foreground': '#1a3e1c',
            '--color-text-primary': '#e0f5e1',
            '--color-text-secondary': '#8fae90',
            '--color-border': '#2a572c',
            '--color-brand-primary': '#A8E063',
            '--color-brand-secondary': '#56AB2F',
        }
    },
    [ThemeId.TROPICAL_SUNSET]: {
        name: 'Hoàng hôn nhiệt đới',
        price: 3000,
        previewColors: ['#FF7E5F', '#FEB47B'],
        lightColors: {
            '--color-background': '#fff5f0',
            '--color-foreground': '#ffffff',
            '--color-text-primary': '#b35843',
            '--color-text-secondary': '#a67c59',
            '--color-border': '#fbe5d9',
            '--color-brand-primary': '#FF7E5F',
            '--color-brand-secondary': '#FEB47B',
        },
        darkColors: {
            '--color-background': '#2e1a14',
            '--color-foreground': '#422b22',
            '--color-text-primary': '#ffe0d1',
            '--color-text-secondary': '#bfa08f',
            '--color-border': '#5c3f36',
            '--color-brand-primary': '#FF7E5F',
            '--color-brand-secondary': '#FEB47B',
        }
    },
    [ThemeId.PURPLE_AURORA]: {
        name: 'Cực quang tím',
        price: 3500,
        previewColors: ['#6A11CB', '#2575FC'],
        lightColors: {
            '--color-background': '#f5f3ff',
            '--color-foreground': '#ffffff',
            '--color-text-primary': '#410a7a',
            '--color-text-secondary': '#685da8',
            '--color-border': '#e5e0f7',
            '--color-brand-primary': '#6A11CB',
            '--color-brand-secondary': '#2575FC',
        },
        darkColors: {
            '--color-background': '#0f0524',
            '--color-foreground': '#1c0d3b',
            '--color-text-primary': '#d9e6ff',
            '--color-text-secondary': '#a39cc7',
            '--color-border': '#32215c',
            '--color-brand-primary': '#2575FC',
            '--color-brand-secondary': '#8a4fff',
        }
    },
    [ThemeId.PASTEL_DREAM]: {
        name: 'Giấc mơ Pastel',
        price: 3200,
        previewColors: ['#A1C4FD', '#C2E9FB'],
        lightColors: {
            '--color-background': '#f7fbff',
            '--color-foreground': '#ffffff',
            '--color-text-primary': '#526c8f',
            '--color-text-secondary': '#8fa4c0',
            '--color-border': '#e3effa',
            '--color-brand-primary': '#A1C4FD',
            '--color-brand-secondary': '#C2E9FB',
        },
        darkColors: {
            '--color-background': '#1a2638',
            '--color-foreground': '#25354d',
            '--color-text-primary': '#e0e9f5',
            '--color-text-secondary': '#9cb0c9',
            '--color-border': '#344a69',
            '--color-brand-primary': '#A1C4FD',
            '--color-brand-secondary': '#C2E9FB',
        }
    },
    [ThemeId.LAVENDER_MINT]: {
        name: 'Oải hương & Bạc hà',
        price: 3200,
        previewColors: ['#D4BBF3', '#A8E6CF'],
        lightColors: {
            '--color-background': '#faf7ff',
            '--color-foreground': '#ffffff',
            '--color-text-primary': '#6d5a7d',
            '--color-text-secondary': '#8a9e96',
            '--color-border': '#e9e3f0',
            '--color-brand-primary': '#D4BBF3',
            '--color-brand-secondary': '#A8E6CF',
        },
        darkColors: {
            '--color-background': '#22242a',
            '--color-foreground': '#31343b',
            '--color-text-primary': '#e5e6e8',
            '--color-text-secondary': '#a2a5ad',
            '--color-border': '#42454d',
            '--color-brand-primary': '#D4BBF3',
            '--color-brand-secondary': '#A8E6CF',
        }
    },
    [ThemeId.MYSTIC_NIGHT]: {
        name: 'Đêm huyền ảo',
        price: 4000,
        previewColors: ['#302B63', '#0F0C29'],
        lightColors: {
            '--color-background': '#f0eff5',
            '--color-foreground': '#ffffff',
            '--color-text-primary': '#302B63',
            '--color-text-secondary': '#5c5885',
            '--color-border': '#d9d7e3',
            '--color-brand-primary': '#302B63',
            '--color-brand-secondary': '#554db3',
        },
        darkColors: {
            '--color-background': '#0F0C29',
            '--color-foreground': '#1a163a',
            '--color-text-primary': '#e4e2f5',
            '--color-text-secondary': '#a39fcc',
            '--color-border': '#302B63',
            '--color-brand-primary': '#7e75d1',
            '--color-brand-secondary': '#a098e6',
        }
    },
    [ThemeId.REFINED_STEEL]: {
        name: 'Thép tinh luyện',
        price: 4000,
        previewColors: ['#BCC3C7', '#2C3E50'],
        lightColors: {
            '--color-background': '#f4f6f7',
            '--color-foreground': '#ffffff',
            '--color-text-primary': '#2C3E50',
            '--color-text-secondary': '#7f8c8d',
            '--color-border': '#e0e4e5',
            '--color-brand-primary': '#34495e',
            '--color-brand-secondary': '#95a5a6',
        },
        darkColors: {
            '--color-background': '#1e2b37',
            '--color-foreground': '#2C3E50',
            '--color-text-primary': '#ecf0f1',
            '--color-text-secondary': '#bdc3c7',
            '--color-border': '#34495e',
            '--color-brand-primary': '#bdc3c7',
            '--color-brand-secondary': '#7f8c8d',
        }
    }
};