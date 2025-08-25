import React, { useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { useUserStore } from './store/useUserStore';
import { useUIStore } from './store/useUIStore';

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

const App = () => {
    // UI state that's local to the App shell
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [activeView, setActiveView] = useState<'dashboard' | 'studyPack'>('dashboard');
    const [selectedPackId, setSelectedPackId] = useState<string | null>(null);
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

    // Modal visibility is controlled here
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isXpModalOpen, setIsXpModalOpen] = useState(false);
    const [isStreakModalOpen, setIsStreakModalOpen] = useState(false);
    const [isTrashModalOpen, setIsTrashModalOpen] = useState(false);

    // Get state and actions from stores
    const checkDailyStreak = useUserStore(state => state.checkDailyStreak);
    const isLoggedIn = useUserStore(state => state.isLoggedIn);
    
    // UI store for global components like toasts and confirm modals
    const toast = useUIStore(state => state.toast);
    const hideToast = useUIStore(state => state.hideToast);
    const confirmModal = useUIStore(state => state.confirmModal);

    // --- Effects ---

    // Effect for initializing theme and checking streak on load
    useEffect(() => {
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
            document.documentElement.classList.add('dark');
            setIsDarkMode(true);
        }
        
        // When the app loads and we know if the user is logged in, check their streak
        if (isLoggedIn) {
             checkDailyStreak();
        }
    }, [isLoggedIn, checkDailyStreak]);
    
    // Effect to check badges whenever user data changes
    useEffect(() => {
        useUserStore.getState().checkAndAwardBadges();
    }, [useUserStore(state => state.unlockedBadges.length), useUserStore(state => state.xp), useUserStore(state => state.studyPacks.length), useUserStore(state => state.questionsAskedCount), useUserStore(state => state.totalCorrectAnswers)]);
    
    // Effect to handle fullscreen changes (e.g., user pressing Esc)
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);


    // --- Handlers ---
    
    const toggleDarkMode = useCallback(() => {
        setIsDarkMode(prev => {
            const newIsDark = !prev;
            if (newIsDark) {
                document.documentElement.classList.add('dark');
                localStorage.setItem('theme', 'dark');
            } else {
                document.documentElement.classList.remove('dark');
                localStorage.setItem('theme', 'light');
            }
            return newIsDark;
        });
    }, []);

    const toggleFullscreen = useCallback(() => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error(`Lỗi khi bật chế độ toàn màn hình: ${err.message} (${err.name})`);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
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
        <div className="min-h-screen flex flex-col">
            <AppHeader
                onToggleDark={toggleDarkMode}
                isDarkMode={isDarkMode}
                onProfileClick={() => setIsProfileModalOpen(true)}
                onStreakClick={() => setIsStreakModalOpen(true)}
                onXpBarClick={() => setIsXpModalOpen(true)}
                onHomeClick={handleBackToHome}
                isAtHome={isAtHome}
                isFullscreen={isFullscreen}
                onToggleFullscreen={toggleFullscreen}
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