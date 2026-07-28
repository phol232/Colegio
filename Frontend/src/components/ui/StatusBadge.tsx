const variants = {
  pendiente: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
  activa: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
  rechazada: 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800',
  retirada: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600',
  elegible: 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
  cerrado: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600',
} as const;

const labels: Record<keyof typeof variants, string> = {
  pendiente: 'Pendiente',
  activa: 'Activa',
  rechazada: 'Rechazada',
  retirada: 'Retirada',
  elegible: 'Elegible',
  cerrado: 'Cerrado',
};

interface StatusBadgeProps {
  status: keyof typeof variants;
  label?: string;
}

export const StatusBadge = ({ status, label }: StatusBadgeProps) => (
  <span
    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${variants[status]}`}
  >
    {label ?? labels[status]}
  </span>
);
