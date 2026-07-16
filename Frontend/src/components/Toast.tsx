import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ToastType, useToastStore } from '../stores/toastStore';

const icons: Record<ToastType, typeof AlertCircle> = {
    error: AlertCircle,
    success: CheckCircle2,
    info: Info,
    warning: AlertTriangle,
};

const styles: Record<ToastType, string> = {
    error: 'border-red-200 bg-white text-slate-900',
    success: 'border-green-200 bg-white text-slate-900',
    info: 'border-slate-200 bg-white text-slate-900',
    warning: 'border-amber-200 bg-white text-slate-900',
};

const iconStyles: Record<ToastType, string> = {
    error: 'text-red-600 bg-red-50',
    success: 'text-green-600 bg-green-50',
    info: 'text-sidebar-bg bg-slate-100',
    warning: 'text-amber-600 bg-amber-50',
};

export const Toast = () => {
    const { message, type, visible } = useToastStore();

    // Animación de entrada: visible pasa a true en el siguiente frame
    useEffect(() => {
        if (message && !visible) {
            const frame = requestAnimationFrame(() => {
                useToastStore.setState({ visible: true });
            });
            return () => cancelAnimationFrame(frame);
        }
    }, [message, visible]);

    if (!message) {
        return null;
    }

    const Icon = icons[type];

    return createPortal(
        <div
            role="alert"
            aria-live="assertive"
            className={cn(
                'pointer-events-none fixed bottom-6 right-6 z-[9999] w-[calc(100%-2rem)] max-w-sm transition-all duration-300 ease-out',
                visible ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0',
            )}
        >
            <div
                className={cn(
                    'flex items-start gap-3 rounded-xl border px-4 py-3.5 shadow-xl ring-1 ring-black/5',
                    styles[type],
                )}
            >
                <div
                    className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                        iconStyles[type],
                    )}
                >
                    <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 pt-0.5">
                    <p className="text-sm font-semibold text-slate-900">
                        {type === 'error' ? 'Acceso restringido' : 'Aviso'}
                    </p>
                    <p className="mt-0.5 text-sm leading-snug text-slate-600">{message}</p>
                </div>
            </div>
        </div>,
        document.body,
    );
};
