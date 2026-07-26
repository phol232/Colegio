import { create } from 'zustand';

interface ThemeState {
    darkMode: boolean;
    init: () => void;
    setDarkMode: (dark: boolean) => void;
}

const applyDarkClass = (dark: boolean) => {
    document.documentElement.classList.toggle('dark', dark);
};

export const useThemeStore = create<ThemeState>((set) => ({
    darkMode: false,

    init: () => {
        const dark = localStorage.getItem('modoOscuro') === 'true';
        applyDarkClass(dark);
        set({ darkMode: dark });
    },

    setDarkMode: (dark) => {
        applyDarkClass(dark);
        localStorage.setItem('modoOscuro', dark ? 'true' : 'false');
        localStorage.setItem('tema', dark ? 'oscuro' : 'claro');
        set({ darkMode: dark });
    },
}));

export const initAppearance = () => {
    useThemeStore.getState().init();

    const tamano = localStorage.getItem('tamanoFuente') || 'mediano';
    switch (tamano) {
        case 'pequeno':
            document.documentElement.style.fontSize = '14px';
            break;
        case 'grande':
            document.documentElement.style.fontSize = '18px';
            break;
        default:
            document.documentElement.style.fontSize = '16px';
    }
};
