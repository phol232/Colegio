import { useState } from 'react';
import api from '../services/api';

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

interface EvaluacionManagerProps {
    cursoId: number;
    mes: number;
    evaluaciones: Evaluacion[];
    onEvaluacionCreated: (evaluacion: Evaluacion) => void;
    onEvaluacionUpdated: (evaluacion: Evaluacion) => void;
    onEvaluacionDeleted: (evaluacionId: number) => void;
}

const TIPOS_EVALUACION = [
    'Práctica',
    'Examen',
    'Tarea',
    'Participación',
    'Proyecto',
    'Otro'
];

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

export const EvaluacionManager: React.FC<EvaluacionManagerProps> = ({
    cursoId,
    mes,
    evaluaciones,
    onEvaluacionCreated,
    onEvaluacionUpdated,
    onEvaluacionDeleted
}) => {
    const [modalAbierto, setModalAbierto] = useState(false);
    const [mostrarFormulario, setMostrarFormulario] = useState(false);
    const [editando, setEditando] = useState<number | null>(null);
    const [guardando, setGuardando] = useState(false);

    const [formData, setFormData] = useState({
        nombre: '',
        tipo_evaluacion: 'Práctica',
        peso: ''
    });

    const calcularPesoDisponible = () => {
        const pesoUsado = evaluaciones
            .filter(e => e.id !== editando && e.peso !== null)
            .reduce((sum, e) => sum + (e.peso || 0), 0);
        return 100 - pesoUsado;
    };

    const validarFormulario = () => {
        if (!formData.nombre.trim()) {
            alert('El nombre de la evaluación es requerido');
            return false;
        }

        if (formData.nombre.trim().length < 3) {
            alert('El nombre debe tener al menos 3 caracteres');
            return false;
        }

        return true;
    };

    const validarPeso = (peso: number | null) => {
        if (peso === null) return true;

        if (peso < 0 || peso > 100) {
            alert('El peso debe estar entre 0 y 100%');
            return false;
        }

        const pesoDisponible = calcularPesoDisponible();
        if (peso > pesoDisponible) {
            alert(`El peso no puede exceder ${pesoDisponible}%. Peso disponible: ${pesoDisponible}%`);
            return false;
        }

        const pesoTotal = evaluaciones
            .filter(e => e.id !== editando && e.peso !== null)
            .reduce((sum, e) => sum + (e.peso || 0), 0) + peso;

        if (pesoTotal > 100) {
            alert(`La suma de pesos no puede exceder 100%. Total actual: ${pesoTotal}%`);
            return false;
        }

        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validarFormulario()) return;

        const peso = formData.peso ? parseFloat(formData.peso) : null;
        if (!validarPeso(peso)) return;

        setGuardando(true);
        try {
            const payload = {
                nombre: formData.nombre.trim(),
                tipo_evaluacion: formData.tipo_evaluacion,
                peso
            };

            let response;
            if (editando) {
                response = await api.put(`/evaluaciones/${editando}`, payload);
            } else {
                response = await api.post('/evaluaciones', {
                    ...payload,
                    curso_id: cursoId,
                    mes
                });
            }

            if (response.data.success) {
                if (editando) {
                    onEvaluacionUpdated(response.data.data);
                } else {
                    onEvaluacionCreated(response.data.data);
                }
                resetForm();
            } else {
                alert(response.data.message || 'Error al guardar evaluación');
            }
        } catch (error: any) {
            const errorMessage = error.response?.data?.message ||
                error.response?.data?.errors?.peso?.[0] ||
                'Error al guardar evaluación';
            alert(errorMessage);
        } finally {
            setGuardando(false);
        }
    };

    const handleEditar = (evaluacion: Evaluacion) => {
        setEditando(evaluacion.id);
        setFormData({
            nombre: evaluacion.nombre,
            tipo_evaluacion: evaluacion.tipo_evaluacion,
            peso: evaluacion.peso?.toString() || ''
        });
        setMostrarFormulario(true);
    };

    const handleEliminar = async (evaluacion: Evaluacion) => {
        const tieneNotas = evaluacion.total_notas > 0;
        const mensaje = tieneNotas 
            ? `⚠️ ADVERTENCIA: Esta evaluación tiene ${evaluacion.total_notas} nota(s) registrada(s).\n\n` +
              `Al eliminar "${evaluacion.nombre}", se eliminarán TODAS las notas asociadas y se recalcularán los promedios.\n\n` +
              `¿Estás seguro de que deseas continuar?`
            : `¿Eliminar la evaluación "${evaluacion.nombre}"?`;

        if (!confirm(mensaje)) return;

        try {
            const response = await api.delete(`/evaluaciones/${evaluacion.id}`, {
                params: { forzar: tieneNotas }
            });

            if (response.data.success) {
                onEvaluacionDeleted(evaluacion.id);
            } else {
                alert(response.data.message || 'Error al eliminar evaluación');
            }
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || 'Error al eliminar evaluación';
            alert(errorMessage);
        }
    };

    const resetForm = () => {
        setFormData({ nombre: '', tipo_evaluacion: 'Práctica', peso: '' });
        setMostrarFormulario(false);
        setEditando(null);
    };

    const pesoDisponible = calcularPesoDisponible();
    const pesoTotal = evaluaciones.reduce((sum, e) => sum + (e.peso || 0), 0);
    const nombreMes = MESES[mes as keyof typeof MESES] || `Mes ${mes}`;

    return (
        <>
            <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-[#0E2B5C]">
                        Evaluaciones ({evaluaciones.length})
                    </h3>
                    <button
                        onClick={() => setModalAbierto(true)}
                        className="px-3 py-1.5 bg-[#17A2E5] hover:bg-[#1589C6] text-white rounded-lg text-xs font-medium transition-colors"
                    >
                        📋 Gestionar Evaluaciones
                    </button>
                </div>

                {evaluaciones.length > 0 ? (
                    <div className="flex items-center gap-2 text-xs text-[#6B7280]">
                        <span>{evaluaciones.length} evaluación(es)</span>
                        {pesoTotal > 0 && (
                            <span className="px-2 py-0.5 bg-[#EFF6FF] text-[#17A2E5] rounded font-medium">
                                Peso total: {pesoTotal}%
                            </span>
                        )}
                    </div>
                ) : (
                    <p className="text-xs text-[#6B7280]">No hay evaluaciones. Haz clic en "Gestionar Evaluaciones" para crear.</p>
                )}
            </div>

            {modalAbierto && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col">
                        <div className="px-6 py-4 border-b border-[#E5E7EB] bg-[#F5F7FA]">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="text-lg font-bold text-[#0E2B5C]">Gestión de Evaluaciones</h2>
                                    <p className="text-xs text-[#6B7280] mt-1">
                                        {nombreMes} - {evaluaciones.length} evaluación(es)
                                    </p>
                                </div>
                                <button
                                    onClick={() => {
                                        setModalAbierto(false);
                                        resetForm();
                                    }}
                                    className="text-[#6B7280] hover:text-[#1F2937] transition-colors"
                                >
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto px-6 py-4">
                            {!mostrarFormulario ? (
                                <button
                                    onClick={() => setMostrarFormulario(true)}
                                    className="w-full px-4 py-3 bg-[#17A2E5] hover:bg-[#1589C6] text-white rounded-lg text-sm font-medium transition-colors mb-4 flex items-center justify-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Nueva Evaluación
                                </button>
                            ) : (
                                <form onSubmit={handleSubmit} className="bg-[#F5F7FA] rounded-lg p-4 mb-4 border border-[#E5E7EB]">
                                    <h3 className="text-sm font-semibold text-[#0E2B5C] mb-3">
                                        {editando ? 'Editar Evaluación' : 'Nueva Evaluación'}
                                    </h3>
                                    <div className="grid grid-cols-3 gap-3 mb-3">
                                        <div>
                                            <label className="block text-xs font-medium text-[#6B7280] mb-1">
                                                Nombre *
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.nombre}
                                                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                                placeholder="Ej: Práctica 1"
                                                required
                                                className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:ring-2 focus:ring-[#17A2E5]"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-[#6B7280] mb-1">
                                                Tipo *
                                            </label>
                                            <select
                                                value={formData.tipo_evaluacion}
                                                onChange={(e) => setFormData({ ...formData, tipo_evaluacion: e.target.value })}
                                                className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:ring-2 focus:ring-[#17A2E5]"
                                            >
                                                {TIPOS_EVALUACION.map(tipo => (
                                                    <option key={tipo} value={tipo}>{tipo}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-[#6B7280] mb-1">
                                                Peso % (opcional)
                                            </label>
                                            <input
                                                type="number"
                                                value={formData.peso}
                                                onChange={(e) => setFormData({ ...formData, peso: e.target.value })}
                                                placeholder="0-100"
                                                min="0"
                                                max={pesoDisponible}
                                                step="0.01"
                                                className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:ring-2 focus:ring-[#17A2E5]"
                                            />
                                        </div>
                                    </div>

                                    {formData.peso && (
                                        <p className="text-xs text-[#6B7280] mb-3">
                                            💡 Peso disponible: {pesoDisponible}%
                                        </p>
                                    )}

                                    <div className="flex gap-2">
                                        <button
                                            type="submit"
                                            disabled={guardando}
                                            className="px-4 py-2 bg-[#C62828] hover:bg-[#B71C1C] text-white rounded-lg text-sm font-medium transition-colors disabled:bg-[#EAB0B0]"
                                        >
                                            {guardando ? 'Guardando...' : (editando ? 'Actualizar' : 'Crear')}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={resetForm}
                                            className="px-4 py-2 border border-[#E5E7EB] text-[#6B7280] rounded-lg text-sm font-medium hover:bg-white transition-colors"
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                </form>
                            )}

                            {evaluaciones.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-[#E5E7EB] border border-[#E5E7EB] rounded-lg">
                                        <thead className="bg-[#F5F7FA]">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-[#0E2B5C]">#</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-[#0E2B5C]">Nombre</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-[#0E2B5C]">Tipo</th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold text-[#0E2B5C]">Peso</th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold text-[#0E2B5C]">Notas</th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold text-[#0E2B5C]">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-[#E5E7EB]">
                                            {evaluaciones.map((evaluacion, index) => (
                                                <tr key={evaluacion.id} className="hover:bg-[#F9FAFB]">
                                                    <td className="px-4 py-3 text-sm text-[#6B7280]">{index + 1}</td>
                                                    <td className="px-4 py-3 text-sm font-medium text-[#1F2937]">
                                                        {evaluacion.nombre}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className="px-2 py-1 bg-[#EFF6FF] text-[#17A2E5] rounded text-xs">
                                                            {evaluacion.tipo_evaluacion}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        {evaluacion.peso ? (
                                                            <span className="px-2 py-1 bg-[#F0FDF4] text-[#22C55E] rounded text-xs font-medium">
                                                                {evaluacion.peso}%
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs text-[#6B7280]">-</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-center text-sm text-[#6B7280]">
                                                        {evaluacion.total_notas}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <button
                                                                onClick={() => handleEditar(evaluacion)}
                                                                className="px-3 py-1 text-[#17A2E5] hover:bg-[#EFF6FF] rounded text-xs transition-colors"
                                                                title="Editar"
                                                            >
                                                                ✏️
                                                            </button>
                                                            <button
                                                                onClick={() => handleEliminar(evaluacion)}
                                                                className="px-3 py-1 text-[#DC2626] hover:bg-[#FEF2F2] rounded text-xs transition-colors"
                                                                title="Eliminar"
                                                            >
                                                                🗑️
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>

                                    {pesoTotal > 0 && (
                                        <div className="mt-3 bg-[#EFF6FF] border border-[#17A2E5] rounded-lg p-3 text-sm">
                                            <span className="text-[#0E2B5C] font-medium">
                                                Peso total: {pesoTotal}% {pesoTotal === 100 ? '✓ Completo' : `(falta ${100 - pesoTotal}%)`}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-12 text-[#6B7280]">
                                    <svg className="w-16 h-16 mx-auto mb-4 text-[#E5E7EB]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <p className="text-sm">No hay evaluaciones creadas</p>
                                    <p className="text-xs mt-1">Haz clic en "Nueva Evaluación" para crear una</p>
                                </div>
                            )}
                        </div>

                        <div className="px-6 py-4 border-t border-[#E5E7EB] bg-[#F5F7FA]">
                            <button
                                onClick={() => {
                                    setModalAbierto(false);
                                    resetForm();
                                }}
                                className="w-full px-4 py-2 bg-[#6B7280] hover:bg-[#4B5563] text-white rounded-lg text-sm font-medium transition-colors"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};