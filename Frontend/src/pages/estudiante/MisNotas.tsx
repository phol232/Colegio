import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { getCourseColor } from '../../utils/courseColors';
import api from '../../services/api';

interface NotaDetallada {
    curso_id: number;
    curso_nombre: string;
    curso_codigo: string;
    promedio_numerico: number;
}

const MESES = {
    3: 'Marzo',
    4: 'Abril',
    5: 'Mayo',
    6: 'Junio',
    7: 'Julio',
    8: 'Agosto',
    9: 'Septiembre',
    10: 'Octubre',
    11: 'Noviembre',
    12: 'Diciembre'
};

const getNotaColor = (puntaje: number): string => {
    if (puntaje >= 17) return 'text-[#22C55E]';
    if (puntaje >= 14) return 'text-[#17A2E5]';
    if (puntaje >= 11) return 'text-[#F4C20D]';
    return 'text-[#DC2626]';
};

const CursoCard: React.FC<{
    curso: NotaDetallada;
    mesSeleccionado: number | null;
    onMesChange: (mes: number | null) => void;
}> = ({ curso, mesSeleccionado, onMesChange }) => {
    const courseColor = getCourseColor(curso.curso_nombre);
    const verNotasUrl =
        mesSeleccionado != null
            ? `/estudiante/notas/curso/${curso.curso_id}?mes=${mesSeleccionado}`
            : `/estudiante/notas/curso/${curso.curso_id}`;

    return (
        <div className="overflow-hidden rounded-lg border border-[#E5E7EB] bg-white shadow transition-shadow hover:shadow-lg">
            <div className="p-4" style={{ backgroundColor: courseColor.light }}>
                <div className="mb-3 flex items-center space-x-3">
                    <div
                        className="flex h-10 w-10 items-center justify-center rounded-lg font-bold text-white"
                        style={{ backgroundColor: courseColor.primary }}
                    >
                        {curso.curso_nombre.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 className="truncate text-base font-bold text-[#0E2B5C]">{curso.curso_nombre}</h3>
                    </div>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-xs text-[#6B7280]">Promedio</span>
                    <p className={`text-2xl font-bold ${getNotaColor(curso.promedio_numerico)}`}>
                        {curso.promedio_numerico.toFixed(1)}
                    </p>
                </div>
            </div>

            <div className="space-y-3 border-t border-[#E5E7EB] p-4">
                <div>
                    <label className="mb-1 block text-xs font-medium text-[#6B7280]">Filtrar por mes:</label>
                    <Select
                        value={mesSeleccionado != null ? String(mesSeleccionado) : 'todos'}
                        onValueChange={(value) =>
                            onMesChange(value === 'todos' ? null : parseInt(value, 10))
                        }
                    >
                        <SelectTrigger className="h-9 text-sm">
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
                <Link
                    to={verNotasUrl}
                    className="block w-full rounded-lg bg-sidebar-bg px-3 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-sidebar-hover"
                >
                    Ver notas
                </Link>
            </div>
        </div>
    );
};

export const MisNotas = () => {
    const navigate = useNavigate();
    const [notasDetalladas, setNotasDetalladas] = useState<NotaDetallada[]>([]);
    const [loading, setLoading] = useState(true);
    const [mesSeleccionado, setMesSeleccionado] = useState<{ [key: number]: number | null }>({});

    useEffect(() => {
        cargarNotasDetalladas();
    }, []);

    const cargarNotasDetalladas = async () => {
        try {
            setLoading(true);
            const response = await api.get('/notas/estudiante/detalladas');

            const notasTransformadas = (response.data.data || []).map((nota: {
                curso_id: number;
                curso_nombre: string;
                curso_codigo?: string;
                promedio_numerico: number;
            }) => ({
                curso_id: nota.curso_id,
                curso_nombre: nota.curso_nombre,
                curso_codigo: nota.curso_codigo || '',
                promedio_numerico: nota.promedio_numerico,
            }));

            setNotasDetalladas(notasTransformadas);
        } catch (error) {
            console.error('Error al cargar notas detalladas:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleMesChange = (cursoId: number, mes: number | null) => {
        setMesSeleccionado(prev => ({ ...prev, [cursoId]: mes }));
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-[#C62828]" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F4F6F8]">
            <div className="border-b border-[#E5E7EB] bg-white shadow-sm">
                <div className="mx-auto flex max-w-[1600px] items-center gap-4 px-6 py-4">
                    <button
                        type="button"
                        onClick={() => navigate('/estudiante/dashboard')}
                        className="text-[#6B7280] transition-colors hover:text-[#1F2937]"
                        aria-label="Volver"
                    >
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-[#0E2B5C]">Mis Notas</h1>
                        <p className="mt-1 text-sm text-[#6B7280]">Consulta tus calificaciones por curso</p>
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-[1600px] px-6 py-6">
                {notasDetalladas.length > 0 ? (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {notasDetalladas.map((curso) => (
                            <CursoCard
                                key={curso.curso_id}
                                curso={curso}
                                mesSeleccionado={mesSeleccionado[curso.curso_id] ?? null}
                                onMesChange={(mes) => handleMesChange(curso.curso_id, mes)}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="rounded-lg border border-[#E5E7EB] bg-white p-12 shadow">
                        <div className="text-center">
                            <svg className="mx-auto mb-4 h-24 w-24 text-[#E5E7EB]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <h3 className="mb-2 text-lg font-medium text-[#1F2937]">No hay notas registradas</h3>
                            <p className="text-sm text-[#6B7280]">Aún no tienes calificaciones registradas en el sistema.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
