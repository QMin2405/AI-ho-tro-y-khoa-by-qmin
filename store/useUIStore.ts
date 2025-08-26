import { create } from 'zustand';
import { ThemeId } from '../types';

type ConfirmModalState = {
    isOpen: boolean;
    title: string;
    text: string;
    confirmText: string;
    onConfirm: () => void;
    onCancel: () => void;
    isDestructive: boolean;
};

type UIState = {
    toast: { message: string; id: number } | null;
    showToast: (message: string) => void;
    hideToast: () => void;
    confirmModal: ConfirmModalState;
    showConfirmModal: (config: Omit<ConfirmModalState, 'isOpen' | 'onCancel'>) => void;
    hideConfirmModal: () => void;
    previewThemeId: ThemeId | null;
    setPreviewTheme: (themeId: ThemeId | null) => void;
};

const initialConfirmModalState: ConfirmModalState = {
    isOpen: false,
    title: '',
    text: '',
    confirmText: 'Xác nhận',
    onConfirm: () => {},
    onCancel: () => {},
    isDestructive: true,
};

export const useUIStore = create<UIState>((set) => ({
    toast: null,
    showToast: (message) => set({ toast: { message, id: Date.now() } }),
    hideToast: () => set({ toast: null }),
    confirmModal: initialConfirmModalState,
    showConfirmModal: (config) => set(state => ({
        confirmModal: {
            ...initialConfirmModalState,
            ...config,
            isOpen: true,
            // Wrap onCancel to automatically close the modal
            onCancel: () => {
                state.hideConfirmModal();
            },
            // Wrap onConfirm to execute the action then close the modal
            onConfirm: () => {
                config.onConfirm();
                state.hideConfirmModal();
            },
        }
    })),
    hideConfirmModal: () => set({ confirmModal: initialConfirmModalState }),
    previewThemeId: null,
    setPreviewTheme: (themeId) => set({ previewThemeId: themeId }),
}));