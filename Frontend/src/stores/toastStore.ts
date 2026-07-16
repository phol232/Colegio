import { create } from 'zustand';

export type ToastType = 'error' | 'success' | 'info' | 'warning';

interface ToastState {
    message: string | null;
    type: ToastType;
    visible: boolean;
    show: (message: string, type?: ToastType, durationMs?: number) => void;
    hide: () => void;
}

let hideTimer: ReturnType<typeof setTimeout> | null = null;
let clearTimer: ReturnType<typeof setTimeout> | null = null;

export const ACCOUNT_BLOCKED_MESSAGE =
    'Tu cuenta ha sido bloqueada. Por favor, contacta al administrador del sistema.';

export const useToastStore = create<ToastState>((set) => ({
    message: null,
    type: 'info',
    visible: false,

    show: (message, type = 'info', durationMs = 2500) => {
        if (hideTimer) {
            clearTimeout(hideTimer);
            hideTimer = null;
        }
        if (clearTimer) {
            clearTimeout(clearTimer);
            clearTimer = null;
        }

        // visible:false primero para que la animación de entrada funcione
        set({ message, type, visible: false });

        hideTimer = setTimeout(() => {
            set({ visible: false });
            clearTimer = setTimeout(() => set({ message: null }), 300);
        }, durationMs);
    },

    hide: () => {
        if (hideTimer) {
            clearTimeout(hideTimer);
            hideTimer = null;
        }
        if (clearTimer) {
            clearTimeout(clearTimer);
            clearTimer = null;
        }
        set({ visible: false });
        setTimeout(() => set({ message: null }), 300);
    },
}));
