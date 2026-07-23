import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { GradesTable } from '../../components/GradesTable';
import { getCourseColor } from '../../utils/courseColors';
import { calcularPromedioEstudiante } from '../../utils/promedioCalculator';
import { nombreMesNotas, BTN_PRIMARY } from '../../utils/evaluacionNotas';
import { getColorTipo } from '../../utils/tiposEvaluacion';
import { sameId, toId } from '../../utils/ids';
import { useToastStore } from '../../stores/toastStore';
import api from '../../services/api';

interface Curso {
    id: number;
    nombre: string;
    codigo: string;
    grado: string;
    seccion: string;
}

interface Estudiante {
    id: number;
    name: string;
    email: string;
}

interface Evaluacion {
    id: number;
    curso_id: number;
    mes: number;
    nombre: string;
    tipo_evaluacion: string;
    peso: number | null;
    orden: number;
    total_notas: number;
}

interface NotaDetalle {
    id: number;
    evaluacion_id: number;
    estudiante_id: number;
    puntaje: number;
}

interface Promedio {
    promedio_numerico: number;
    total_evaluaciones: number;
}

export const NotasEditor = () => {
    const { cursoId, mes } = useParams<{ cursoId: string; mes: string }>();
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const navigate = useNavigate();
    const tipoSeleccionado = (searchParams.get('tipo') ?? '').trim();
    const soloLectura = location.pathname.endsWith('/ver');

    const [curso, setCurso] = useState<Curso | null>(null);
    const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
    const [evaluaciones, setEvaluaciones] = useState<Evaluacion[]>([]);
    const [notas, setNotas] = useState<Map<string, number>>(new Map());
    const [notasOriginales, setNotasOriginales] = useState<Map<string, number>>(new Map());
    const [notasModificadas, setNotasModificadas] = useState<Set<string>>(new Set());
    const [promedios, setPromedios] = useState<Map<number, Promedio>>(new Map());
    const [loading, setLoading] = useState(true);
    const [cargandoDatos, setCargandoDatos] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const showToast = useToastStore((s) => s.show);

    const hubPath = `/docente/notas/curso/${cursoId}/mes/${mes}`;

    useEffect(() => {
        if (!tipoSeleccionado) {
            navigate(hubPath, { replace: true });
            return;
        }
        cargarDatos();
    }, [cursoId, mes, tipoSeleccionado]);

    const cargarDatos = async () => {
        if (!cursoId || !mes) return;

        setLoading(true);
        setCargandoDatos(true);
        setError(null);

        try {
            const respCursos = await api.get('/docente/cursos');
            const cursoEncontrado = respCursos.data.data?.find((c: Curso) => sameId(c.id, cursoId));
            
            if (!cursoEncontrado) {
                throw new Error('Curso no encontrado');
            }
            
            setCurso(cursoEncontrado);

            const respEstudiantes = await api.get(`/cursos/${cursoId}/estudiantes`);
            setEstudiantes(respEstudiantes.data.data || []);

            const respEvaluaciones = await api.get(`/evaluaciones/curso/${cursoId}/mes/${mes}`);
            const todas: Evaluacion[] = respEvaluaciones.data.data || [];
            // Solo el tipo seleccionado en esta pantalla (Examen, Práctica, etc.)
            const delTipo = todas.filter(
                (e) => e.tipo_evaluacion.trim().toLowerCase() === tipoSeleccionado.toLowerCase(),
            );
            setEvaluaciones(delTipo);

            const notasMap = new Map<string, number>();

            for (const evaluacion of delTipo) {
                const respNotas = await api.get(`/notas-detalle/evaluacion/${evaluacion.id}`);
                const notasEval = respNotas.data.data || [];

                notasEval.forEach((nota: NotaDetalle) => {
                    const key = `${toId(nota.estudiante_id)}-${toId(nota.evaluacion_id)}`;
                    notasMap.set(key, nota.puntaje);
                });
            }

            setNotas(notasMap);
            setNotasOriginales(new Map(notasMap));
            setNotasModificadas(new Set());

            calcularPromediosLocales(delTipo, notasMap, respEstudiantes.data.data || []);

        } catch (error: any) {
            console.error('Error al cargar datos:', error);
            const errorMsg = error.response?.data?.message || 'Error al cargar los datos';
            setError(errorMsg);
            showToast(errorMsg, 'error', 3500, 'Error al cargar datos');
        } finally {
            setLoading(false);
            setCargandoDatos(false);
        }
    };

    const calcularPromediosLocales = (evals: Evaluacion[], notasMap: Map<string, number>, estudiantesData: Estudiante[]) => {
        const promediosMap = new Map<number, Promedio>();

        estudiantesData.forEach(estudiante => {
            const estudianteId = toId(estudiante.id);
            const notasEstudiante = evals
                .map(evaluacion => ({
                    evaluacionId: toId(evaluacion.id),
                    puntaje: notasMap.get(`${toId(estudiante.id)}-${toId(evaluacion.id)}`)
                }))
                .filter(n => n.puntaje !== undefined) as Array<{ evaluacionId: number; puntaje: number }>;

            if (notasEstudiante.length > 0) {
                const promedio = calcularPromedioEstudiante(evals, notasEstudiante);
                promediosMap.set(estudianteId, promedio);
            }
        });

        setPromedios(promediosMap);
    };

    const handleNotaChange = (estudianteId: number, evaluacionId: number, puntaje: number | null) => {
        const key = `${toId(estudianteId)}-${toId(evaluacionId)}`;
        const nuevasNotas = new Map(notas);
        const nuevasModificadas = new Set(notasModificadas);

        if (puntaje === null) {
            nuevasNotas.delete(key);
        } else {
            nuevasNotas.set(key, puntaje);
        }

        const notaOriginal = notasOriginales.get(key);
        if (puntaje !== notaOriginal) {
            nuevasModificadas.add(key);
        } else {
            nuevasModificadas.delete(key);
        }

        setNotas(nuevasNotas);
        setNotasModificadas(nuevasModificadas);
        calcularPromediosLocales(evaluaciones, nuevasNotas, estudiantes);
    };

    const guardarNotas = async () => {
        if (!curso || notasModificadas.size === 0) {
            const title = notasModificadas.size === 0 ? 'Sin cambios' : 'Error';
            const message = notasModificadas.size === 0 ? 'No hay cambios para guardar.' : 'Error: No hay curso seleccionado';
            showToast(message, 'warning', 3500, title);
            return;
        }

        const notasArray: Array<{ evaluacion_id: number; estudiante_id: number; puntaje: number }> = [];
        
        notasModificadas.forEach(key => {
            const puntaje = notas.get(key);
            if (puntaje !== undefined) {
                const [estudiante_id, evaluacion_id] = key.split('-').map(Number);
                
                if (puntaje < 0 || puntaje > 20) {
                    showToast(`La nota ${puntaje} no es válida. Debe estar entre 0 y 20.`, 'error', 3500, 'Nota inválida');
                    return;
                }
                
                notasArray.push({ evaluacion_id, estudiante_id, puntaje });
            }
        });

        if (notasArray.length === 0) {
            showToast('No hay notas válidas para guardar.', 'warning', 3500, 'Sin notas válidas');
            return;
        }

        setGuardando(true);
        setError(null);

        try {
            const response = await api.post('/notas-detalle/bulk', { notas: notasArray });

            if (response.data.success) {
                showToast(`Se han registrado ${notasArray.length} nota${notasArray.length !== 1 ? 's' : ''} correctamente.`, 'success', 3500, 'Notas guardadas');
                const nuevasOriginales = new Map(notasOriginales);
                notasArray.forEach(nota => {
                    const key = `${nota.estudiante_id}-${nota.evaluacion_id}`;
                    nuevasOriginales.set(key, nota.puntaje);
                });
                setNotasOriginales(nuevasOriginales);
                setNotasModificadas(new Set());
            } else {
                showToast(response.data.message || 'Error al guardar notas', 'error', 3500, 'Error al guardar');
            }
        } catch (error: any) {
            const errorMsg = error.response?.data?.message ||
                error.response?.data?.errors?.notas?.[0] ||
                'Error al guardar notas. Por favor intenta nuevamente.';
            setError(errorMsg);
            showToast(errorMsg, 'error', 3500, 'Error al guardar notas');
        } finally {
            setGuardando(false);
        }
    };

    if (loading || !tipoSeleccionado) {
        return (
            <>
                <div className="flex items-center justify-center h-screen">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sidebar-bg"></div>
                </div>
            </>
        );
    }

    if (!curso) {
        return (
            <>
                <div className="flex items-center justify-center h-screen">
                    <div className="text-center">
                        <p className="text-red-600 mb-4">Curso no encontrado</p>
                        <button
                            onClick={() => navigate(hubPath)}
                            className={BTN_PRIMARY}
                        >
                            Volver
                        </button>
                    </div>
                </div>
            </>
        );
    }

    const courseColor = getCourseColor(curso.nombre);
    const nombreMes = nombreMesNotas(parseInt(mes!, 10));
    const tipoColors = getColorTipo(tipoSeleccionado);
    const pesoTipo = evaluaciones.reduce((s, e) => s + (e.peso ?? 0), 0);

    return (
        <>
            <div className="min-h-screen bg-[#F4F6F8]">
                <div className="bg-white border-b border-[#E5E7EB] shadow-sm">
                    <div className="max-w-[1600px] mx-auto px-6 py-4">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate(hubPath)}
                                className="text-[#6B7280] hover:text-[#1F2937] transition-colors"
                                type="button"
                                aria-label="Volver"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <div>
                                <h1 className="text-2xl font-bold text-[#0E2B5C]">
                                    {curso.nombre} - {nombreMes}
                                </h1>
                                <p className="text-sm text-[#6B7280] mt-1">
                                    {curso.codigo} • {curso.grado} • Sección {curso.seccion}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-[#EFF6FF] border-b border-[#17A2E5]">
                    <div className="max-w-[1600px] mx-auto px-6 py-3">
                        <p className="text-sm text-[#0E2B5C]">
                            {soloLectura
                                ? 'Vista de solo lectura. Las notas no se pueden editar aquí.'
                                : 'Las notas deben estar en el rango de 0 a 20. Nota mínima aprobatoria: 11'}
                        </p>
                    </div>
                </div>

                <div className="max-w-[1600px] mx-auto px-6 py-6">
                    {cargandoDatos ? (
                        <div className="bg-white rounded-lg shadow border border-[#E5E7EB] p-6">
                            <div className="flex items-center justify-center py-12">
                                <div className="text-center">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C62828] mx-auto mb-4"></div>
                                    <p className="text-sm text-[#6B7280]">Cargando datos...</p>
                                </div>
                            </div>
                        </div>
                    ) : error ? (
                        <div className="bg-white rounded-lg shadow border border-[#E5E7EB] p-6">
                            <div className="flex items-center justify-center py-12">
                                <div className="text-center">
                                    <svg className="w-12 h-12 text-red-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <p className="text-sm text-red-600 mb-2">{error}</p>
                                    <button
                                        onClick={() => cargarDatos()}
                                        className={BTN_PRIMARY}
                                        type="button"
                                    >
                                        Reintentar
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-lg shadow border border-[#E5E7EB] p-6">
                            <div className="mb-4 flex flex-wrap items-center gap-2">
                                <h2 className="text-base font-semibold text-[#0E2B5C]">{tipoSeleccionado}</h2>
                                <span className={`rounded px-2 py-0.5 text-xs font-medium ${tipoColors.bg} ${tipoColors.text}`}>
                                    Peso del tipo: {pesoTipo}%
                                </span>
                                {soloLectura && (
                                    <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                                        Solo lectura
                                    </span>
                                )}
                            </div>
                            <GradesTable
                                evaluaciones={evaluaciones}
                                estudiantes={estudiantes}
                                notas={notas}
                                promedios={promedios}
                                courseColor={courseColor}
                                onNotaChange={handleNotaChange}
                                onGuardarNotas={soloLectura ? undefined : guardarNotas}
                                guardando={guardando}
                                showPromedio
                                readOnly={soloLectura}
                                emptyMessage={`No hay evaluaciones de tipo "${tipoSeleccionado}" para este mes.`}
                            />
                        </div>
                    )}

                    {promedios.size > 0 && (
                        <div className="mt-6 bg-white rounded-lg shadow border border-[#E5E7EB] p-6">
                            <h3 className="text-sm font-semibold text-[#0E2B5C] mb-4">Estadísticas</h3>
                            <div className="grid grid-cols-4 gap-4">
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-[#0E2B5C]">{estudiantes.length}</p>
                                    <p className="text-xs text-[#6B7280] mt-1">Total Estudiantes</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-[#17A2E5]">{promedios.size}</p>
                                    <p className="text-xs text-[#6B7280] mt-1">Con Notas</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-[#22C55E]">
                                        {Array.from(promedios.values()).filter(p => p.promedio_numerico >= 11).length}
                                    </p>
                                    <p className="text-xs text-[#6B7280] mt-1">Aprobados</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-[#DC2626]">
                                        {Array.from(promedios.values()).filter(p => p.promedio_numerico < 11).length}
                                    </p>
                                    <p className="text-xs text-[#6B7280] mt-1">Desaprobados</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};