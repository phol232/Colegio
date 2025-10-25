import { useState } from 'react';

interface Evaluacion {
    id: number;
    nombre: string;
    tipo_evaluacion: string;
    peso: number | null;
    orden: number;
}

interface Estudiante {
    id: number;
    name: string;
    email: string;
}

interface Promedio {
    promedio_numerico: number;
    promedio_literal: string | null;
    total_evaluaciones: number;
}

interface GradesTableProps {
    evaluaciones: Evaluacion[];
    estudiantes: Estudiante[];
    notas: Map<string, number>; // key: "estudiante_id-evaluacion_id"
    promedios: Map<number, Promedio>; // key: estudiante_id
    courseColor: { primary: string; light: string };
    onNotaChange: (estudianteId: number, evaluacionId: number, puntaje: number | null) => void;
    onGuardarNotas?: () => void;
    guardando?: boolean;
}

export const GradesTable: React.FC<GradesTableProps> = ({
    evaluaciones,
    estudiantes,
    notas,
    promedios,
    courseColor,
    onNotaChange,
    onGuardarNotas,
    guardando = false
}) => {
    const [editando, setEditando] = useState<string | null>(null);
    const [valorTemp, setValorTemp] = useState<string>('');

    const getNotaKey = (estudianteId: number, evaluacionId: number) => {
        return `${estudianteId}-${evaluacionId}`;
    };

    const getNota = (estudianteId: number, evaluacionId: number): number | null => {
        const key = getNotaKey(estudianteId, evaluacionId);
        return notas.get(key) ?? null;
    };

    const handleCeldaClick = (estudianteId: number, evaluacionId: number) => {
        const key = getNotaKey(estudianteId, evaluacionId);
        const nota = getNota(estudianteId, evaluacionId);
        setEditando(key);
        setValorTemp(nota !== null ? nota.toString() : '');
    };

    const handleGuardar = (estudianteId: number, evaluacionId: number) => {
        if (valorTemp === '') {
            onNotaChange(estudianteId, evaluacionId, null);
            setEditando(null);
            setValorTemp('');
            return;
        }

        const valor = parseFloat(valorTemp);

        // Validar que sea un número válido
        if (isNaN(valor)) {
            alert('Por favor ingresa un número válido');
            return;
        }

        // Validar rango 0-20
        if (valor < 0 || valor > 20) {
            alert('La nota debe estar entre 0 y 20');
            return;
        }

        onNotaChange(estudianteId, evaluacionId, valor);
        setEditando(null);
        setValorTemp('');
    };

    const handleKeyDown = (e: React.KeyboardEvent, estudianteId: number, evaluacionId: number) => {
        if (e.key === 'Enter') {
            handleGuardar(estudianteId, evaluacionId);
        } else if (e.key === 'Escape') {
            setEditando(null);
            setValorTemp('');
        }
    };

    const getEstadoNota = (puntaje: number | null) => {
        if (puntaje === null) return { color: 'text-gray-400', bg: 'bg-gray-50' };

        if (puntaje >= 14) return { color: 'text-green-600', bg: 'bg-green-50' };
        if (puntaje >= 11) return { color: 'text-yellow-600', bg: 'bg-yellow-50' };
        return { color: 'text-red-600', bg: 'bg-red-50' };
    };

    const getEstadoPromedio = (promedio: number) => {
        if (promedio >= 14) return { color: 'text-green-600', bg: 'bg-green-100' };
        if (promedio >= 11) return { color: 'text-yellow-600', bg: 'bg-yellow-100' };
        return { color: 'text-red-600', bg: 'bg-red-100' };
    };

    if (evaluaciones.length === 0) {
        return (
            <div className="text-center py-8 text-[#6B7280]">
                <p>No hay evaluaciones creadas para esta unidad.</p>
                <p className="text-sm mt-2">Crea evaluaciones para empezar a registrar notas.</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <div className="inline-block min-w-full align-middle">
                <div className="overflow-hidden border border-[#E5E7EB] rounded-lg">
                    <table className="min-w-full divide-y divide-[#E5E7EB]">
                        <thead className="bg-[#F5F7FA]">
                            <tr>
                                <th className="sticky left-0 z-10 bg-[#F5F7FA] px-3 py-2 text-left text-xs font-semibold text-[#0E2B5C] border-r border-[#E5E7EB]">
                                    #
                                </th>
                                <th className="sticky left-8 z-10 bg-[#F5F7FA] px-3 py-2 text-left text-xs font-semibold text-[#0E2B5C] border-r border-[#E5E7EB] min-w-[200px]">
                                    Estudiante
                                </th>
                                {evaluaciones.map((evaluacion) => (
                                    <th
                                        key={evaluacion.id}
                                        className="px-3 py-2 text-center text-xs font-semibold text-[#0E2B5C] min-w-[100px]"
                                    >
                                        <div>{evaluacion.nombre}</div>
                                        <div className="text-[10px] text-[#6B7280] font-normal mt-0.5">
                                            {evaluacion.tipo_evaluacion}
                                            {evaluacion.peso && ` (${evaluacion.peso}%)`}
                                        </div>
                                    </th>
                                ))}
                                <th className="sticky right-0 z-10 bg-[#F5F7FA] px-3 py-2 text-center text-xs font-semibold text-[#0E2B5C] border-l border-[#E5E7EB] min-w-[120px]">
                                    Promedio
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-[#E5E7EB]">
                            {estudiantes.map((estudiante, index) => {
                                const promedio = promedios.get(estudiante.id);
                                const estadoPromedio = promedio ? getEstadoPromedio(promedio.promedio_numerico) : null;

                                return (
                                    <tr key={estudiante.id} className="hover:bg-[#F9FAFB]">
                                        <td className="sticky left-0 z-10 bg-white px-3 py-2 text-xs text-[#6B7280] border-r border-[#E5E7EB]">
                                            {index + 1}
                                        </td>
                                        <td className="sticky left-8 z-10 bg-white px-3 py-2 border-r border-[#E5E7EB]">
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                                                    style={{ backgroundColor: courseColor.primary }}
                                                >
                                                    {estudiante.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-[#1F2937] truncate">
                                                        {estudiante.name}
                                                    </p>
                                                    <p className="text-xs text-[#6B7280] truncate">
                                                        {estudiante.email}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        {evaluaciones.map((evaluacion) => {
                                            const nota = getNota(estudiante.id, evaluacion.id);
                                            const key = getNotaKey(estudiante.id, evaluacion.id);
                                            const estado = getEstadoNota(nota);
                                            const isEditando = editando === key;

                                            return (
                                                <td
                                                    key={evaluacion.id}
                                                    className={`px-3 py-2 text-center ${estado.bg}`}
                                                    onClick={() => !isEditando && handleCeldaClick(estudiante.id, evaluacion.id)}
                                                >
                                                    {isEditando ? (
                                                        <input
                                                            type="number"
                                                            value={valorTemp}
                                                            onChange={(e) => setValorTemp(e.target.value)}
                                                            onBlur={() => handleGuardar(estudiante.id, evaluacion.id)}
                                                            onKeyDown={(e) => handleKeyDown(e, estudiante.id, evaluacion.id)}
                                                            min="0"
                                                            max="20"
                                                            step="0.5"
                                                            autoFocus
                                                            className="w-16 px-2 py-1 border border-[#17A2E5] rounded text-center text-sm focus:ring-2 focus:ring-[#17A2E5]"
                                                        />
                                                    ) : (
                                                        <span className={`text-sm font-medium ${estado.color} cursor-pointer hover:underline`}>
                                                            {nota !== null ? nota.toFixed(1) : '-'}
                                                        </span>
                                                    )}
                                                </td>
                                            );
                                        })}
                                        <td className={`sticky right-0 z-10 px-3 py-2 text-center border-l border-[#E5E7EB] ${estadoPromedio?.bg || 'bg-gray-50'}`}>
                                            {promedio ? (
                                                <div>
                                                    <div className={`text-sm font-bold ${estadoPromedio?.color}`}>
                                                        {promedio.promedio_numerico.toFixed(2)}
                                                    </div>
                                                    <div className="text-[10px] text-[#6B7280] mt-0.5">
                                                        {promedio.total_evaluaciones}/{evaluaciones.length}
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-gray-400">-</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Leyenda y Botón de Guardar */}
            <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs text-[#6B7280]">
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-green-100 border border-green-600 rounded"></div>
                        <span>Aprobado (14-20)</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-yellow-100 border border-yellow-600 rounded"></div>
                        <span>Regular (11-13)</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-red-100 border border-red-600 rounded"></div>
                        <span>Desaprobado (0-10)</span>
                    </div>
                </div>
                
                {onGuardarNotas && (
                    <button
                        onClick={onGuardarNotas}
                        disabled={guardando}
                        className="px-6 py-2.5 bg-[#C62828] hover:bg-[#B71C1C] text-white rounded-lg transition-colors disabled:bg-[#EAB0B0] disabled:cursor-not-allowed font-semibold flex items-center gap-2"
                    >
                        {guardando ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                Guardando...
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Guardar Notas
                            </>
                        )}
                    </button>
                )}
            </div>
        </div>
    );
};
