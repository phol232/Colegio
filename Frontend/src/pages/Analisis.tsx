import { useState, useEffect, useRef, useCallback } from 'react';
import {
    Users,
    TrendingUp,
    TrendingDown,
    Minus,
    ClipboardCheck,
    AlertTriangle,
    BarChart3,
    BookOpen,
    Award,
    Filter,
    Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToastStore } from '../stores/toastStore';
import api from '../services/api';
import { useAnalisisRealtime } from '../hooks/useAnalisisRealtime';

interface EstadisticasGenerales {
    total_estudiantes: number;
    promedio_general: number;
    promedio_asistencia: number;
    cursos_con_bajo_rendimiento: number;
    tendencia_mensual: Array<{
        mes: string;
        promedio: number;
        asistencia: number;
    }>;
    distribucion_notas: {
        excelente: number;
        bueno: number;
        regular: number;
        bajo: number;
    };
}

interface ComparativaCursos {
    id: number;
    nombre: string;
    promedio: number;
    asistencia: number;
    total_estudiantes: number;
    tendencia: string;
}

const distribucionConfig = [
    {
        key: 'excelente' as const,
        label: 'Excelente',
        rango: '18-20',
        value: 'text-emerald-700 dark:text-emerald-300',
        card: 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40',
        label_color: 'text-emerald-600 dark:text-emerald-400',
    },
    {
        key: 'bueno' as const,
        label: 'Bueno',
        rango: '15-17',
        value: 'text-sky-700 dark:text-sky-300',
        card: 'border-sky-200 bg-sky-50 dark:border-sky-800 dark:bg-sky-950/40',
        label_color: 'text-sky-600 dark:text-sky-400',
    },
    {
        key: 'regular' as const,
        label: 'Regular',
        rango: '11-14',
        value: 'text-amber-700 dark:text-amber-300',
        card: 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40',
        label_color: 'text-amber-600 dark:text-amber-400',
    },
    {
        key: 'bajo' as const,
        label: 'Bajo',
        rango: '0-10',
        value: 'text-red-700 dark:text-red-300',
        card: 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/40',
        label_color: 'text-red-600 dark:text-red-400',
    },
];

export const Analisis = () => {
    const [estadisticas, setEstadisticas] = useState<EstadisticasGenerales | null>(null);
    const [comparativa, setComparativa] = useState<ComparativaCursos[]>([]);
    const [loading, setLoading] = useState(true);
    const [fechaInicio, setFechaInicio] = useState('');
    const [fechaFin, setFechaFin] = useState('');
    const versionRef = useRef<number | null>(null);
    const fechasRef = useRef({ inicio: '', fin: '' });

    const showToast = useToastStore((s) => s.show);

    const cargarDatos = useCallback(async (inicio?: string, fin?: string, silent = false) => {
        try {
            if (!silent) setLoading(true);
            const params = new URLSearchParams();
            if (inicio) params.append('fecha_inicio', inicio);
            if (fin) params.append('fecha_fin', fin);

            const [estadisticasRes, comparativaRes, versionRes] = await Promise.all([
                api.get(`/analisis/estadisticas?${params.toString()}`),
                api.get(`/analisis/comparativa?${params.toString()}`),
                api.get('/analisis/version').catch(() => null),
            ]);

            setEstadisticas(estadisticasRes.data.data);
            setComparativa(comparativaRes.data.data || []);
            if (versionRes?.data?.data?.version != null) {
                versionRef.current = Number(versionRes.data.data.version);
            }
        } catch (error: any) {
            if (!silent) {
                showToast(error.response?.data?.message || 'Error al cargar datos de análisis', 'error', 3500, 'Error');
            }
        } finally {
            if (!silent) setLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        const hoy = new Date();
        const hace30Dias = new Date(hoy.getTime() - 30 * 24 * 60 * 60 * 1000);
        const inicio = hace30Dias.toISOString().split('T')[0];
        const fin = hoy.toISOString().split('T')[0];

        setFechaInicio(inicio);
        setFechaFin(fin);
        fechasRef.current = { inicio, fin };
        cargarDatos(inicio, fin);
    }, [cargarDatos]);

    useEffect(() => {
        fechasRef.current = { inicio: fechaInicio, fin: fechaFin };
    }, [fechaInicio, fechaFin]);

    const refreshSilent = useCallback(() => {
        const { inicio, fin } = fechasRef.current;
        void cargarDatos(inicio || undefined, fin || undefined, true);
    }, [cargarDatos]);

    useAnalisisRealtime(refreshSilent, versionRef);

    const handleFiltrar = () => {
        if (!fechaInicio || !fechaFin) {
            showToast('Por favor seleccione ambas fechas', 'warning', 3500, 'Validación');
            return;
        }
        cargarDatos(fechaInicio, fechaFin);
    };

    const getTendencia = (tendencia: string) => {
        switch (tendencia) {
            case 'up':
                return {
                    icon: TrendingUp,
                    label: 'En alza',
                    className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
                };
            case 'down':
                return {
                    icon: TrendingDown,
                    label: 'A la baja',
                    className: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800',
                };
            default:
                return {
                    icon: Minus,
                    label: 'Estable',
                    className: 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600',
                };
        }
    };

    const tarjetas = [
        {
            label: 'Estudiantes',
            value: estadisticas?.total_estudiantes ?? 0,
            icon: Users,
            iconWrap: 'bg-sky-100 text-sky-600 dark:bg-sky-950 dark:text-sky-300',
        },
        {
            label: 'Promedio General',
            value: estadisticas?.promedio_general?.toFixed(2) ?? '0.00',
            icon: TrendingUp,
            iconWrap: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300',
        },
        {
            label: 'Asistencia',
            value: `${estadisticas?.promedio_asistencia?.toFixed(1) ?? '0.0'}%`,
            icon: ClipboardCheck,
            iconWrap: 'bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-300',
        },
        {
            label: 'Bajo Rendimiento',
            value: estadisticas?.cursos_con_bajo_rendimiento ?? 0,
            icon: AlertTriangle,
            iconWrap: 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-300',
        },
    ];

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <Loader2 className="h-10 w-10 animate-spin text-secondary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="border-b border-border bg-background-white shadow-sm dark:border-slate-700">
                <div className="mx-auto max-w-[1600px] px-6 py-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-start gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-white">
                                <BarChart3 className="h-6 w-6" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight text-secondary dark:text-slate-100">
                                    Análisis de Rendimiento
                                </h1>
                                <p className="mt-1 text-sm text-text-secondary dark:text-slate-400">
                                    Métricas y estadísticas del sistema educativo
                                </p>
                            </div>
                        </div>

                        {/* Filtros de fecha */}
                        <div className="flex flex-wrap items-end gap-3">
                            <div>
                                <label className="mb-1 block text-xs font-medium text-text-secondary dark:text-slate-400">Desde</label>
                                <input
                                    type="date"
                                    value={fechaInicio}
                                    onChange={(e) => setFechaInicio(e.target.value)}
                                    className="rounded-lg border border-border bg-background-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-medium text-text-secondary dark:text-slate-400">Hasta</label>
                                <input
                                    type="date"
                                    value={fechaFin}
                                    onChange={(e) => setFechaFin(e.target.value)}
                                    className="rounded-lg border border-border bg-background-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                                />
                            </div>
                            <button
                                onClick={handleFiltrar}
                                className="inline-flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-secondary-hover"
                            >
                                <Filter className="h-4 w-4" />
                                Filtrar
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Contenido */}
            <div className="mx-auto max-w-[1600px] p-6">
                {/* Estadísticas Principales */}
                <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                    {tarjetas.map(({ label, value, icon: Icon, iconWrap }) => (
                        <div
                            key={label}
                            className="rounded-xl border border-border bg-background-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-slate-700 dark:shadow-none"
                        >
                            <div className="flex items-center gap-4">
                                <div className={cn('flex h-12 w-12 items-center justify-center rounded-lg', iconWrap)}>
                                    <Icon className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-text-secondary dark:text-slate-400">{label}</p>
                                    <p className="text-2xl font-bold text-secondary dark:text-slate-100">{value}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Distribución de Notas */}
                <div className="mb-6 rounded-xl border border-border bg-background-white p-6 shadow-sm dark:border-slate-700">
                    <div className="mb-4 flex items-center gap-2">
                        <Award className="h-5 w-5 text-secondary dark:text-slate-300" />
                        <h3 className="text-lg font-semibold text-secondary dark:text-slate-100">Distribución de Notas</h3>
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                        {distribucionConfig.map((item) => (
                            <div
                                key={item.key}
                                className={cn('rounded-xl border p-5 text-center', item.card)}
                            >
                                <p className={cn('text-3xl font-bold', item.value)}>
                                    {estadisticas?.distribucion_notas?.[item.key] ?? 0}
                                </p>
                                <p className={cn('mt-1 text-sm font-medium', item.label_color)}>
                                    {item.label} <span className="text-xs opacity-70">({item.rango})</span>
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Comparativa de Cursos */}
                <div className="rounded-xl border border-border bg-background-white p-6 shadow-sm dark:border-slate-700">
                    <div className="mb-4 flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-secondary dark:text-slate-300" />
                        <h3 className="text-lg font-semibold text-secondary dark:text-slate-100">Comparativa de Cursos</h3>
                    </div>
                    {comparativa.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <BookOpen className="mb-3 h-12 w-12 text-slate-300 dark:text-slate-600" />
                            <p className="text-sm font-medium text-text-secondary dark:text-slate-400">
                                No hay datos de cursos disponibles
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead>
                                    <tr className="border-b border-border bg-background dark:border-slate-700 dark:bg-slate-800/60">
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-secondary dark:text-slate-300">Curso</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-secondary dark:text-slate-300">Estudiantes</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-secondary dark:text-slate-300">Promedio</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-secondary dark:text-slate-300">Asistencia</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-secondary dark:text-slate-300">Tendencia</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border dark:divide-slate-700">
                                    {comparativa.map((curso) => {
                                        const tendencia = getTendencia(curso.tendencia);
                                        const TendenciaIcon = tendencia.icon;
                                        return (
                                            <tr key={curso.id} className="transition-colors hover:bg-background dark:hover:bg-slate-800/50">
                                                <td className="px-4 py-3 text-sm font-medium text-secondary dark:text-slate-200">
                                                    {curso.nombre}
                                                </td>
                                                <td className="px-4 py-3 text-center text-sm text-text dark:text-slate-300">
                                                    {curso.total_estudiantes}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={cn(
                                                        'inline-block rounded-full px-3 py-1 text-xs font-semibold',
                                                        curso.promedio >= 15
                                                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                                            : curso.promedio >= 11
                                                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                                                : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                                                    )}>
                                                        {curso.promedio.toFixed(2)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center text-sm text-text dark:text-slate-300">
                                                    {curso.asistencia.toFixed(1)}%
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex justify-center">
                                                        <span className={cn(
                                                            'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold',
                                                            tendencia.className
                                                        )}>
                                                            <TendenciaIcon className="h-3.5 w-3.5" />
                                                            {tendencia.label}
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
