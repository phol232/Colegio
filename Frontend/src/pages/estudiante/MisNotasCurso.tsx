import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { getColorTipo } from '../../utils/tiposEvaluacion';
import { calcularPromedioEstudiante } from '../../utils/promedioCalculator';
import { BTN_PRIMARY } from '../../utils/evaluacionNotas';
import api from '../../services/api';

interface EvaluacionNota {
    id: number;
    nombre: string;
    tipo_evaluacion: string;
    mes: number;
    puntaje: number | null;
    peso: number | null;
}

interface CursoNotas {
    curso_id: number;
    curso_nombre: string;
    curso_codigo: string;
    evaluaciones: EvaluacionNota[];
    promedio_numerico: number;
}

const MESES: Record<number, string> = {
    3: 'Marzo',
    4: 'Abril',
    5: 'Mayo',
    6: 'Junio',
    7: 'Julio',
    8: 'Agosto',
    9: 'Septiembre',
    10: 'Octubre',
    11: 'Noviembre',
    12: 'Diciembre',
};

const getNotaColor = (puntaje: number | null): string => {
    if (puntaje === null) return 'text-[#6B7280]';
    if (puntaje >= 17) return 'text-[#22C55E]';
    if (puntaje >= 14) return 'text-[#17A2E5]';
    if (puntaje >= 11) return 'text-[#F4C20D]';
    return 'text-[#DC2626]';
};

const getNotaBg = (puntaje: number | null): string => {
    if (puntaje === null) return 'bg-[#F5F7FA]';
    if (puntaje >= 17) return 'bg-[#F0FDF4]';
    if (puntaje >= 14) return 'bg-[#EFF6FF]';
    if (puntaje >= 11) return 'bg-[#FFFBEB]';
    return 'bg-[#FEF2F2]';
};

const EvaluacionCard: React.FC<{ evaluacion: EvaluacionNota }> = ({ evaluacion }) => (
    <div className="rounded-lg border border-[#E5E7EB] bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
        <div className="mb-3 flex items-start justify-between">
            <div className="flex-1">
                <h4 className="mb-1 text-sm font-semibold text-[#1F2937]">{evaluacion.nombre}</h4>
                <div className="flex items-center gap-2">
                    <span className="rounded bg-[#EFF6FF] px-2 py-0.5 text-xs font-medium text-[#17A2E5]">
                        {evaluacion.tipo_evaluacion}
                    </span>
                    <span className="text-xs text-[#6B7280]">{MESES[evaluacion.mes]}</span>
                </div>
            </div>
            <div className={`flex h-16 w-16 items-center justify-center rounded-lg ${getNotaBg(evaluacion.puntaje)}`}>
                <span className={`text-xl font-bold ${getNotaColor(evaluacion.puntaje)}`}>
                    {evaluacion.puntaje !== null ? evaluacion.puntaje.toFixed(1) : '-'}
                </span>
            </div>
        </div>
        {evaluacion.peso != null && (
            <div className="text-xs text-[#6B7280]">
                Peso: <span className="font-medium text-[#1F2937]">{evaluacion.peso}%</span>
            </div>
        )}
    </div>
);

export const MisNotasCurso = () => {
    const { cursoId } = useParams<{ cursoId: string }>();
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();

    const mesParam = searchParams.get('mes');
    const mesFiltro = mesParam ? parseInt(mesParam, 10) : null;

    const [curso, setCurso] = useState<CursoNotas | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const cargar = async () => {
            if (!cursoId) return;
            setLoading(true);
            setError(null);
            try {
                const response = await api.get('/notas/estudiante/detalladas');
                const lista = response.data.data || [];
                const encontrado = lista.find(
                    (c: CursoNotas) => String(c.curso_id) === String(cursoId),
                );
                if (!encontrado) {
                    setError('Curso no encontrado');
                    setCurso(null);
                } else {
                    setCurso({
                        curso_id: encontrado.curso_id,
                        curso_nombre: encontrado.curso_nombre,
                        curso_codigo: encontrado.curso_codigo || '',
                        evaluaciones: encontrado.evaluaciones || [],
                        promedio_numerico: Number(encontrado.promedio_numerico),
                    });
                }
            } catch {
                setError('No se pudieron cargar las notas');
            } finally {
                setLoading(false);
            }
        };
        cargar();
    }, [cursoId]);

    const evaluacionesFiltradas = useMemo(() => {
        if (!curso) return [];
        if (!mesFiltro) return curso.evaluaciones;
        return curso.evaluaciones.filter((e) => e.mes === mesFiltro);
    }, [curso, mesFiltro]);

    const grupos = useMemo(() => {
        return evaluacionesFiltradas.reduce((map, ev) => {
            const tipo = ev.tipo_evaluacion;
            if (!map.has(tipo)) map.set(tipo, []);
            map.get(tipo)!.push(ev);
            return map;
        }, new Map<string, EvaluacionNota[]>());
    }, [evaluacionesFiltradas]);

    const promedioMes = useMemo(() => {
        if (!mesFiltro || evaluacionesFiltradas.length === 0) return null;
        const notas = evaluacionesFiltradas
            .filter((e) => e.puntaje != null)
            .map((e) => ({ evaluacionId: e.id, puntaje: Number(e.puntaje) }));
        if (notas.length === 0) return null;
        return calcularPromedioEstudiante(
            evaluacionesFiltradas.map((e) => ({ id: e.id, peso: e.peso })),
            notas,
        );
    }, [mesFiltro, evaluacionesFiltradas]);

    const handleMesChange = (value: string) => {
        if (value === 'todos') {
            searchParams.delete('mes');
        } else {
            searchParams.set('mes', value);
        }
        setSearchParams(searchParams, { replace: true });
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-sidebar-bg" />
            </div>
        );
    }

    if (error || !curso) {
        return (
            <div className="flex h-screen flex-col items-center justify-center gap-4 px-6">
                <p className="text-red-600">{error || 'Curso no encontrado'}</p>
                <Link to="/estudiante/notas" className={BTN_PRIMARY}>
                    Volver a mis notas
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F4F6F8]">
            <div className="border-b border-[#E5E7EB] bg-white shadow-sm">
                <div className="mx-auto flex max-w-[1600px] items-center gap-4 px-6 py-4">
                    <button
                        type="button"
                        onClick={() => navigate('/estudiante/notas')}
                        className="text-[#6B7280] transition-colors hover:text-[#1F2937]"
                        aria-label="Volver"
                    >
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-[#0E2B5C]">{curso.curso_nombre}</h1>
                        <p className="mt-1 text-sm text-[#6B7280]">
                            Promedio general:{' '}
                            <span className={`font-bold ${getNotaColor(curso.promedio_numerico)}`}>
                                {curso.promedio_numerico.toFixed(2)}
                            </span>
                        </p>
                    </div>
                </div>
            </div>

            <div className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-6 py-3">
                    <label className="text-sm font-medium text-[#6B7280]">Filtrar por mes:</label>
                    <Select
                        value={mesFiltro != null ? String(mesFiltro) : 'todos'}
                        onValueChange={handleMesChange}
                    >
                        <SelectTrigger className="w-48">
                            <SelectValue placeholder="Todos los meses" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="todos">Todos los meses</SelectItem>
                            {Object.entries(MESES).map(([num, nombre]) => (
                                <SelectItem key={num} value={num}>
                                    {nombre}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="mx-auto max-w-[1600px] px-6 py-6">
                {evaluacionesFiltradas.length === 0 ? (
                    <div className="rounded-lg border border-[#E5E7EB] bg-white p-12 text-center">
                        <p className="text-sm text-[#6B7280]">
                            {mesFiltro
                                ? `No hay evaluaciones en ${MESES[mesFiltro]}`
                                : 'No hay evaluaciones registradas'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {mesFiltro && promedioMes && (
                            <div className="rounded-lg border border-[#E5E7EB] bg-white px-4 py-3 shadow-sm">
                                <p className="text-sm text-[#6B7280]">
                                    Promedio del mes ({MESES[mesFiltro]}):{' '}
                                    <span className={`font-bold ${getNotaColor(promedioMes.promedio_numerico)}`}>
                                        {promedioMes.promedio_numerico.toFixed(2)}
                                    </span>
                                </p>
                            </div>
                        )}

                        {Array.from(grupos.entries()).map(([tipo, items]) => {
                            const colors = getColorTipo(tipo);
                            const pesoTipo = items.reduce((s, e) => s + (e.peso ?? 0), 0);
                            const notasTipo = items
                                .filter((e) => e.puntaje != null)
                                .map((e) => ({
                                    evaluacionId: e.id,
                                    puntaje: Number(e.puntaje),
                                }));
                            const promedioTipo =
                                notasTipo.length > 0
                                    ? calcularPromedioEstudiante(
                                          items.map((e) => ({ id: e.id, peso: e.peso })),
                                          notasTipo,
                                      )
                                    : null;

                            return (
                                <div key={tipo} className="rounded-lg border border-[#E5E7EB] bg-white p-6 shadow-sm">
                                    <div className="mb-4 flex flex-wrap items-center gap-2">
                                        <h2 className="text-base font-semibold text-[#0E2B5C]">{tipo}</h2>
                                        <span className={`rounded px-2 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`}>
                                            Peso {pesoTipo}%
                                        </span>
                                        {promedioTipo && (
                                            <span className="text-xs text-[#6B7280]">
                                                Promedio del tipo:{' '}
                                                <span className={`font-semibold ${getNotaColor(promedioTipo.promedio_numerico)}`}>
                                                    {promedioTipo.promedio_numerico.toFixed(2)}
                                                </span>
                                            </span>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                        {items.map((evaluacion) => (
                                            <EvaluacionCard key={evaluacion.id} evaluacion={evaluacion} />
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
