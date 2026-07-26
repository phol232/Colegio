import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => (
    <textarea
        className={cn(
            'flex min-h-[96px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-colors',
            'placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-bg focus-visible:ring-offset-0 focus-visible:border-transparent',
            'disabled:cursor-not-allowed disabled:opacity-50 resize-none',
            'dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500',
            className,
        )}
        ref={ref}
        {...props}
    />
));
Textarea.displayName = 'Textarea';

export { Textarea };
