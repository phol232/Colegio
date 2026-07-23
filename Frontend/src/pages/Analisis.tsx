import { useState, useEffect } from 'react';
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
        excelente: number; // 18-20
        bueno: number;     // 15-17
        regular: number;   // 11-14
        bajo: number;      // 0-10
    };
}

interface ComparativaCursos {
    id: number;
    nombre: string;
    promedio: number;
    asistencia: number;
    total_estudiantes: number;
    tendencia: string; // 'up' | 'down' | 'stable'
}

const distribucionConfig = [
    {
        key: 'excelente' as const,
        label: 'Excelente',
        rango: '18-20',
        value: 'text-emerald-700',
        card: 'border-emerald-200 bg-emerald-50',
        label_color: 'text-emerald-600',
    },
    {
        key: 'bueno' as const,
        label: 'Bueno',
        rango: '15-17',
        value: 'text-sky-700',
        card: 'border-sky-200 bg-sky-50',
        label_color: 'text-sky-600',
    },
    {
        key: 'regular' as const,
        label: 'Regular',
        rango: '11-14',
        value: 'text-amber-700',
        card: 'border-amber-200 bg-amber-50',
        label_color: 'text-amber-600',
    },
    {
        key: 'bajo' as const,
        label: 'Bajo',
        rango: '0-10',
        value: 'text-red-700',
        card: 'border-red-200 bg-red-50',
        label_color: 'text-red-600',
    },
];

export const Analisis = () => {
    const [estadisticas, setEstadisticas] = useState<EstadisticasGenerales | null>(null);
    const [comparativa, setComparativa] = useState<ComparativaCursos[]>([]);
    const [loading, setLoading] = useState(true);
    const [fechaInicio, setFechaInicio] = useState('');
    const [fechaFin, setFechaFin] = useState('');
    
    const showToast = useToastStore((s) => s.show);

    useEffect(() => {
        // Establecer fecha por defecto: último mes
        const hoy = new Date();
        const hace30Dias = new Date(hoy.getTime() - 30 * 24 * 60 * 60 * 1000);

        setFechaInicio(hace30Dias.toISOString().split('T')[0]);
        setFechaFin(hoy.toISOString().split('T')[0]);

        cargarDatos();
    }, []);

    const cargarDatos = async (inicio?: string, fin?: string) => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (inicio) params.append('fecha_inicio', inicio);
            if (fin) params.append('fecha_fin', fin);

            const [estadisticasRes, comparativaRes] = await Promise.all([
                api.get(`/analisis/estadisticas?${params.toString()}`),
                api.get(`/analisis/comparativa?${params.toString()}`)
            ]);

            setEstadisticas(estadisticasRes.data.data);
            setComparativa(comparativaRes.data.data || []);
        } catch (error: any) {
            showToast(error.response?.data?.message || 'Error al cargar datos de análisis', 'error', 3500, 'Error');
        } finally {
            setLoading(false);
        }
    };

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
                    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                };
            case 'down':
                return {
                    icon: TrendingDown,
                    label: 'A la baja',
                    className: 'bg-red-50 text-red-700 border-red-200',
                };
            default:
                return {
                    icon: Minus,
                    label: 'Estable',
                    className: 'bg-slate-50 text-slate-600 border-slate-200',
                };
        }
    };

    const tarjetas = [
        {
            label: 'Estudiantes',
            value: estadisticas?.total_estudiantes ?? 0,
            icon: Users,
            iconWrap: 'bg-sky-100 text-sky-600',
        },
        {
            label: 'Promedio General',
            value: estadisticas?.promedio_general?.toFixed(2) ?? '0.00',
            icon: TrendingUp,
            iconWrap: 'bg-emerald-100 text-emerald-600',
        },
        {
            label: 'Asistencia',
            value: `${estadisticas?.promedio_asistencia?.toFixed(1) ?? '0.0'}%`,
            icon: ClipboardCheck,
            iconWrap: 'bg-violet-100 text-violet-600',
        },
        {
            label: 'Bajo Rendimiento',
            value: estadisticas?.cursos_con_bajo_rendimiento ?? 0,
            icon: AlertTriangle,
            iconWrap: 'bg-red-100 text-red-600',
        },
    ];

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#F4F6F8]">
                <Loader2 className="h-10 w-10 animate-spin text-[#0E2B5C]" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F4F6F8]">
            {/* Header */}
            <div className="border-b border-[#E5E7EB] bg-white shadow-sm">
                <div className="mx-auto max-w-[1600px] px-6 py-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-start gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0E2B5C] text-white">
                                <BarChart3 className="h-6 w-6" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight text-[#0E2B5C]">
                                    Análisis de Rendimiento
                                </h1>
                                <p className="mt-1 text-sm text-[#6B7280]">
                                    Métricas y estadísticas del sistema educativo
                                </p>
                            </div>
                        </div>

                        {/* Filtros de fecha */}
                        <div className="flex flex-wrap items-end gap-3">
                            <div>
                                <label className="mb-1 block text-xs font-medium text-[#6B7280]">Desde</label>
                                <input
                                    type="date"
                                    value={fechaInicio}
                                    onChange={(e) => setFechaInicio(e.target.value)}
                                    className="rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-[#0E2B5C] focus:ring-2 focus:ring-[#0E2B5C]/20"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-medium text-[#6B7280]">Hasta</label>
                                <input
                                    type="date"
                                    value={fechaFin}
                                    onChange={(e) => setFechaFin(e.target.value)}
                                    className="rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-[#0E2B5C] focus:ring-2 focus:ring-[#0E2B5C]/20"
                                />
                            </div>
                            <button
                                onClick={handleFiltrar}
                                className="inline-flex items-center gap-2 rounded-lg bg-[#0E2B5C] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0A2247]"
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
                            className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
                        >
                            <div className="flex items-center gap-4">
                                <div className={cn('flex h-12 w-12 items-center justify-center rounded-lg', iconWrap)}>
                                    <Icon className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-[#6B7280]">{label}</p>
                                    <p className="text-2xl font-bold text-[#0E2B5C]">{value}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Distribución de Notas */}
                <div className="mb-6 rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
                    <div className="mb-4 flex items-center gap-2">
                        <Award className="h-5 w-5 text-[#0E2B5C]" />
                        <h3 className="text-lg font-semibold text-[#0E2B5C]">Distribución de Notas</h3>
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
                <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
                    <div className="mb-4 flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-[#0E2B5C]" />
                        <h3 className="text-lg font-semibold text-[#0E2B5C]">Comparativa de Cursos</h3>
                    </div>
                    {comparativa.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <BookOpen className="mb-3 h-12 w-12 text-slate-300" />
                            <p className="text-sm font-medium text-[#6B7280]">
                                No hay datos de cursos disponibles
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead>
                                    <tr className="border-b border-[#E5E7EB] bg-[#F5F7FA]">
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#0E2B5C]">Curso</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-[#0E2B5C]">Estudiantes</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-[#0E2B5C]">Promedio</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-[#0E2B5C]">Asistencia</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-[#0E2B5C]">Tendencia</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#E5E7EB]">
                                    {comparativa.map((curso) => {
                                        const tendencia = getTendencia(curso.tendencia);
                                        const TendenciaIcon = tendencia.icon;
                                        return (
                                            <tr key={curso.id} className="transition-colors hover:bg-[#F9FAFB]">
                                                <td className="px-4 py-3 text-sm font-medium text-[#0E2B5C]">
                                                    {curso.nombre}
                                                </td>
                                                <td className="px-4 py-3 text-center text-sm text-[#1F2937]">
                                                    {curso.total_estudiantes}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={cn(
                                                        'inline-block rounded-full px-3 py-1 text-xs font-semibold',
                                                        curso.promedio >= 15
                                                            ? 'bg-emerald-100 text-emerald-800'
                                                            : curso.promedio >= 11
                                                                ? 'bg-amber-100 text-amber-800'
                                                                : 'bg-red-100 text-red-800'
                                                    )}>
                                                        {curso.promedio.toFixed(2)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center text-sm text-[#1F2937]">
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
