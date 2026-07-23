import { create } from 'zustand';

export type ToastType = 'error' | 'success' | 'info' | 'warning';

interface ToastState {
    message: string | null;
    title: string | null;
    type: ToastType;
    visible: boolean;
    show: (message: string, type?: ToastType, durationMs?: number, title?: string) => void;
    hide: () => void;
}

const DEFAULT_TITLES: Record<ToastType, string> = {
    success: 'Éxito',
    error: 'Error',
    warning: 'Atención',
    info: 'Aviso',
};

/** Duración visible del toast por tipo (ms). */
const TOAST_DURATION_MS: Record<ToastType, number> = {
    success: 1000,
    error: 2000,
    warning: 2000,
    info: 2000,
};

let hideTimer: ReturnType<typeof setTimeout> | null = null;
let clearTimer: ReturnType<typeof setTimeout> | null = null;

export const ACCOUNT_BLOCKED_MESSAGE =
    'Tu cuenta ha sido bloqueada. Por favor, contacta al administrador del sistema.';

export const useToastStore = create<ToastState>((set) => ({
    message: null,
    title: null,
    type: 'info',
    visible: false,

    show: (message, type = 'info', _durationMs?, title?) => {
        const durationMs = TOAST_DURATION_MS[type];
        if (hideTimer) {
            clearTimeout(hideTimer);
            hideTimer = null;
        }
        if (clearTimer) {
            clearTimeout(clearTimer);
            clearTimer = null;
        }

        // visible:false primero para que la animación de entrada funcione
        set({
            message,
            type,
            title: title ?? DEFAULT_TITLES[type],
            visible: false,
        });

        hideTimer = setTimeout(() => {
            set({ visible: false });
            clearTimer = setTimeout(() => set({ message: null, title: null }), 300);
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
        setTimeout(() => set({ message: null, title: null }), 300);
    },
}));
