import React, { useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { useUserStore } from './store/useUserStore';
import { useUIStore } from './store/useUIStore';
import { ThemeId } from './types';
import { THEMES_DATA } from './constants';

import { AppHeader } from './components/AppHeader';
import { Dashboard } from './components/Dashboard';
import { StudyPackView } from './components/StudyPackView';
import { CreateStudyPackModal } from './components/CreateStudyPackModal';
import { FloatingTutorPopup } from './components/FloatingTutorPopup';
import { ProfileModal } from './components/modals/ProfileModal';
import { XpModal } from './components/modals/XpModal';
import { StreakModal } from './components/modals/StreakModal';
import { TrashModal } from './components/modals/TrashModal';
import { ConfirmModal } from './components/modals/ConfirmModal';
import { ToastNotification } from './components/ui/ToastNotification';
import { ShopModal } from './components/modals/ShopModal';
import { QuestsModal } from './components/modals/QuestsModal';
import { InventoryModal } from './components/modals/InventoryModal';

const App = () => {
    // UI state that's local to the App shell
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [activeView, setActiveView] = useState<'dashboard' | 'studyPack'>('dashboard');
    const [selectedPackId, setSelectedPackId] = useState<string | null>(null);
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

    // Modal visibility is controlled here
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isXpModalOpen, setIsXpModalOpen] = useState(false);
    const [isStreakModalOpen, setIsStreakModalOpen] = useState(false);
    const [isTrashModalOpen, setIsTrashModalOpen] = useState(false);
    const [isShopModalOpen, setIsShopModalOpen] = useState(false);
    const [isQuestsModalOpen, setIsQuestsModalOpen] = useState(false);
    const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);


    // Get state and actions from stores
    const checkDailyStreak = useUserStore(state => state.checkDailyStreak);
    const autoCleanupTrash = useUserStore(state => state.autoCleanupTrash);
    const refreshQuests = useUserStore(state => state.refreshQuests);
    const isLoggedIn = useUserStore(state => state.isLoggedIn);
    const activeThemeId = useUserStore(state => state.activeTheme);
    
    // UI store for global components like toasts and confirm modals
    const toast = useUIStore(state => state.toast);
    const hideToast = useUIStore(state => state.hideToast);
    const confirmModal = useUIStore(state => state.confirmModal);
    const previewThemeId = useUIStore(state => state.previewThemeId);

    // --- Effects ---

    // Effect to apply theme colors and dark mode class
    useEffect(() => {
        const themeIdToApply = previewThemeId || activeThemeId || ThemeId.DEFAULT;
        const theme = THEMES_DATA[themeIdToApply];
        const colors = isDarkMode ? theme.darkColors : theme.lightColors;

        Object.entries(colors).forEach(([key, value]) => {
            // FIX: Explicitly cast value to string to resolve TypeScript error.
            document.documentElement.style.setProperty(key, value as string);
        });

        if (isDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [activeThemeId, isDarkMode, previewThemeId]);


    // Effect for initializing dark mode and checking streak on load
    useEffect(() => {
        // This effect only sets the initial dark mode state
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
            setIsDarkMode(true);
        } else {
            setIsDarkMode(false);
        }
        
        // Cleanup trash on app start
        autoCleanupTrash();
        
        // Refresh quests
        refreshQuests();

        // When the app loads and we know if the user is logged in, check their streak
        if (isLoggedIn) {
             checkDailyStreak();
        }
    }, [isLoggedIn, checkDailyStreak, autoCleanupTrash, refreshQuests]);
    
    // Effect to check badges whenever user data changes
    useEffect(() => {
        useUserStore.getState().checkAndAwardBadges();
    }, [useUserStore(state => state.unlockedBadges.length), useUserStore(state => state.xp), useUserStore(state => state.studyPacks.length), useUserStore(state => state.questionsAskedCount), useUserStore(state => state.totalCorrectAnswers)]);


    // --- Handlers ---
    
    const toggleDarkMode = useCallback(() => {
        setIsDarkMode(prev => {
            const newIsDark = !prev;
            if (newIsDark) {
                localStorage.setItem('theme', 'dark');
            } else {
                localStorage.setItem('theme', 'light');
            }
            return newIsDark;
        });
    }, []);
    
    const handleSelectPack = useCallback((id: string) => {
        setSelectedPackId(id);
        setActiveView('studyPack');
    }, []);

    const handleBackToHome = useCallback(() => {
        setActiveView('dashboard');
        setSelectedPackId(null);
        setCurrentFolderId(null);
    }, []);

    const isAtHome = activeView === 'dashboard' && currentFolderId === null;

    return (
        <div className="min-h-screen flex flex-col bg-background text-text-primary">
            <AppHeader
                onToggleDark={toggleDarkMode}
                isDarkMode={isDarkMode}
                onProfileClick={() => setIsProfileModalOpen(true)}
                onStreakClick={() => setIsStreakModalOpen(true)}
                onXpBarClick={() => setIsXpModalOpen(true)}
                onHomeClick={handleBackToHome}
                isAtHome={isAtHome}
                onShopClick={() => setIsShopModalOpen(true)}
                onQuestsClick={() => setIsQuestsModalOpen(true)}
                onInventoryClick={() => setIsInventoryModalOpen(true)}
            />
            <main className="flex-grow">
                {activeView === 'dashboard' && (
                    <Dashboard
                        onSelectPack={handleSelectPack}
                        onCreateNew={() => setIsCreateModalOpen(true)}
                        onOpenTrash={() => setIsTrashModalOpen(true)}
                        currentFolderId={currentFolderId}
                        onSetCurrentFolderId={setCurrentFolderId}
                    />
                )}
                {activeView === 'studyPack' && selectedPackId && (
                    <StudyPackView
                        key={selectedPackId} // Add key to force re-mount on pack change
                        studyPackId={selectedPackId}
                        onBack={handleBackToHome}
                    />
                )}
            </main>
            
            <FloatingTutorPopup />

            {isCreateModalOpen && (
                <CreateStudyPackModal
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                />
            )}
            {isProfileModalOpen && (
                <ProfileModal
                    isOpen={isProfileModalOpen}
                    onClose={() => setIsProfileModalOpen(false)}
                />
            )}
            {isXpModalOpen && (
                <XpModal
                    isOpen={isXpModalOpen}
                    onClose={() => setIsXpModalOpen(false)}
                />
            )}
            {isStreakModalOpen && (
                <StreakModal
                    isOpen={isStreakModalOpen}
                    onClose={() => setIsStreakModalOpen(false)}
                />
            )}
            {isTrashModalOpen && (
                <TrashModal
                    isOpen={isTrashModalOpen}
                    onClose={() => setIsTrashModalOpen(false)}
                />
            )}
            {isShopModalOpen && (
                <ShopModal
                    isOpen={isShopModalOpen}
                    onClose={() => setIsShopModalOpen(false)}
                />
            )}
            {isQuestsModalOpen && (
                <QuestsModal
                    isOpen={isQuestsModalOpen}
                    onClose={() => setIsQuestsModalOpen(false)}
                />
            )}
             {isInventoryModalOpen && (
                <InventoryModal
                    isOpen={isInventoryModalOpen}
                    onClose={() => setIsInventoryModalOpen(false)}
                />
            )}
            
            {toast && <ToastNotification key={toast.id} message={toast.message} onDismiss={hideToast} />}
            
            {confirmModal.isOpen && (
                <ConfirmModal
                    title={confirmModal.title}
                    text={confirmModal.text}
                    confirmText={confirmModal.confirmText}
                    onConfirm={confirmModal.onConfirm}
                    onCancel={confirmModal.onCancel}
                    isDestructive={confirmModal.isDestructive}
                />
            )}
        </div>
    );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);