import { useEffect, type ReactNode } from 'react';

export const btnPrimary =
    'inline-flex items-center justify-center gap-1.5 rounded-lg bg-sidebar-bg px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-sidebar-hover focus:outline-none focus:ring-2 focus:ring-sidebar-bg focus:ring-offset-2';

export const btnPrimarySm =
    'inline-flex items-center justify-center gap-1.5 rounded-lg bg-sidebar-bg px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-sidebar-hover focus:outline-none focus:ring-2 focus:ring-sidebar-bg focus:ring-offset-2';

export const btnOutlineSecondary =
    'inline-flex items-center justify-center gap-1.5 rounded-lg border border-secondary bg-white px-3 py-2 text-sm font-medium text-secondary transition-colors hover:bg-secondary/5 focus:outline-none focus:ring-2 focus:ring-secondary/30';

const ModalCloseButton = ({ onClose }: { onClose: () => void }) => (
    <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar"
        className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-300"
    >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
    </button>
);

interface FormModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    subtitle: string;
    icon: ReactNode;
    children: ReactNode;
    footer: ReactNode;
}

export const FormModal = ({ isOpen, onClose, title, subtitle, icon, children, footer }: FormModalProps) => {
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) onClose();
        };
        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
            <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                <ModalCloseButton onClose={onClose} />
                <div className="border-b border-slate-100 px-6 py-5 pr-12">
                    <div className="flex items-start gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                            {icon}
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
                            <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
                        </div>
                    </div>
                </div>
                <div className="px-6 py-5">{children}</div>
                <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/80 px-6 py-4 sm:flex-row sm:justify-end">
                    {footer}
                </div>
            </div>
        </div>
    );
};
