import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  backTo?: string;
  onBack?: () => void;
  actions?: ReactNode;
}

export const PageHeader = ({
  title,
  description,
  onBack,
  actions,
}: PageHeaderProps) => (
  <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div className="flex items-start gap-3">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          aria-label="Volver"
          className="mt-1 rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
    </div>
    {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
  </div>
);
