import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import api from '../../services/api';

interface Seccion {
    id: number;
    nombre: string;
    capacidad: number;
}

interface OpcionMatricula {
    grado: {
        id: number;
        nombre: string;
        numero: number;
        nivel: string;
    };
    secciones: Seccion[];
}

export const Matricula = () => {
    const navigate = useNavigate();
    const [opciones, setOpciones] = useState<OpcionMatricula[]>([]);
    const [loading, setLoading] = useState(true);
    const [matriculado, setMatriculado] = useState(false);
    const [infoMatricula, setInfoMatricula] = useState<{ grado: string; seccion: string } | null>(null);
    const [procesando, setProcesando] = useState(false);

    useEffect(() => {
        cargarDatos();
    }, []);

    const cargarDatos = async () => {
        try {
            setLoading(true);
            
            // Verificar estado de matrícula
            const estadoRes = await api.get('/matricula/estado');
            setMatriculado(estadoRes.data.matriculado);
            setInfoMatricula(estadoRes.data.info);

            // Si no está matriculado, cargar opciones
            if (!estadoRes.data.matriculado) {
                const opcionesRes = await api.get('/matricula/opciones');
                setOpciones(opcionesRes.data.data || []);
            }
        } catch (error) {
            console.error('Error al cargar datos de matrícula:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleMatricular = async (gradoId: number, seccionId: number, gradoNombre: string, seccionNombre: string) => {
        if (!confirm(`¿Estás seguro de matricularte en ${gradoNombre} - Sección ${seccionNombre}? Esta acción no se puede deshacer.`)) {
            return;
        }

        try {
            setProcesando(true);
            const response = await api.post('/matricula', {
                grado_id: gradoId,
                seccion_id: seccionId
            });

            if (response.data.success) {
                alert(`¡Matrícula exitosa! Has sido matriculado en ${gradoNombre} - Sección ${seccionNombre}. Se te han asignado ${response.data.data.cursos_asignados} cursos.`);
                cargarDatos(); // Recargar para mostrar el estado actualizado
            }
        } catch (error: any) {
            console.error('Error al matricular:', error);
            alert(error.response?.data?.message || 'Error al realizar la matrícula');
        } finally {
            setProcesando(false);
        }
    };

    if (loading) {
        return (
            <Layout>
                <div className="flex items-center justify-center h-screen">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C62828]"></div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="min-h-screen bg-[#F4F6F8]">
                {/* Header */}
                <div className="bg-white border-b border-[#E5E7EB] shadow-sm">
                    <div className="max-w-[1600px] mx-auto px-6 py-4">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate('/estudiante/dashboard')}
                                className="text-[#6B7280] hover:text-[#1F2937] transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <div>
                                <h1 className="text-2xl font-bold text-[#0E2B5C]">Matrícula</h1>
                                <p className="text-sm text-[#6B7280] mt-1">
                                    {matriculado ? 'Tu información de matrícula' : 'Selecciona tu grado y sección'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="max-w-[1600px] mx-auto px-6 py-6">
                    {matriculado ? (
                        /* Ya está matriculado */
                        <div className="bg-white rounded-lg shadow border border-[#E5E7EB] p-8">
                            <div className="text-center">
                                <div className="w-20 h-20 bg-[#22C55E] rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <h2 className="text-2xl font-bold text-[#0E2B5C] mb-2">¡Ya estás matriculado!</h2>
                                <p className="text-[#6B7280] mb-6">Has sido matriculado exitosamente en:</p>
                                <div className="bg-[#F9FAFB] rounded-lg p-6 max-w-md mx-auto">
                                    <div className="flex items-center justify-center gap-4">
                                        <div className="text-center">
                                            <p className="text-sm text-[#6B7280] mb-1">Grado</p>
                                            <p className="text-xl font-bold text-[#0E2B5C]">{infoMatricula?.grado}</p>
                                        </div>
                                        <div className="w-px h-12 bg-[#E5E7EB]"></div>
                                        <div className="text-center">
                                            <p className="text-sm text-[#6B7280] mb-1">Sección</p>
                                            <p className="text-xl font-bold text-[#0E2B5C]">{infoMatricula?.seccion}</p>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => navigate('/estudiante/dashboard')}
                                    className="mt-6 px-6 py-3 bg-[#17A2E5] hover:bg-[#1589C6] text-white font-medium rounded-lg transition-colors"
                                >
                                    Ir al Dashboard
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* Opciones de matrícula */
                        <div className="space-y-8">
                            {/* Primaria */}
                            {opciones.filter(o => o.grado.nivel === 'primaria').length > 0 && (
                                <div>
                                    <h2 className="text-2xl font-bold text-[#0E2B5C] mb-4">Primaria</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {opciones
                                            .filter(o => o.grado.nivel === 'primaria')
                                            .map((opcion) => (
                                                <div key={opcion.grado.id} className="bg-white rounded-lg shadow border border-[#E5E7EB] overflow-hidden hover:shadow-lg transition-shadow">
                                                    <div className="bg-gradient-to-r from-[#17A2E5] to-[#1589C6] px-6 py-4">
                                                        <h3 className="text-xl font-bold text-white">{opcion.grado.nombre}</h3>
                                                    </div>
                                                    <div className="p-4">
                                                        <p className="text-sm text-[#6B7280] mb-3">Secciones disponibles:</p>
                                                        <div className="space-y-2">
                                                            {opcion.secciones.map((seccion) => (
                                                                <div
                                                                    key={seccion.id}
                                                                    className="border border-[#E5E7EB] rounded-lg p-3 hover:bg-[#F9FAFB] transition-colors"
                                                                >
                                                                    <div className="flex items-center justify-between mb-2">
                                                                        <div>
                                                                            <h4 className="text-base font-bold text-[#0E2B5C]">Sección {seccion.nombre}</h4>
                                                                            <p className="text-xs text-[#6B7280]">Cap: {seccion.capacidad} estudiantes</p>
                                                                        </div>
                                                                    </div>
                                                                    <button
                                                                        onClick={() => handleMatricular(opcion.grado.id, seccion.id, opcion.grado.nombre, seccion.nombre)}
                                                                        disabled={procesando}
                                                                        className="w-full px-3 py-2 bg-[#17A2E5] hover:bg-[#1589C6] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                                    >
                                                                        {procesando ? 'Procesando...' : 'Matricularme'}
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            )}

                            {/* Secundaria */}
                            {opciones.filter(o => o.grado.nivel === 'secundaria').length > 0 && (
                                <div>
                                    <h2 className="text-2xl font-bold text-[#0E2B5C] mb-4">Secundaria</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {opciones
                                            .filter(o => o.grado.nivel === 'secundaria')
                                            .map((opcion) => (
                                                <div key={opcion.grado.id} className="bg-white rounded-lg shadow border border-[#E5E7EB] overflow-hidden hover:shadow-lg transition-shadow">
                                                    <div className="bg-gradient-to-r from-[#0E2B5C] to-[#1a3d6b] px-6 py-4">
                                                        <h3 className="text-xl font-bold text-white">{opcion.grado.nombre}</h3>
                                                    </div>
                                                    <div className="p-4">
                                                        <p className="text-sm text-[#6B7280] mb-3">Secciones disponibles:</p>
                                                        <div className="space-y-2">
                                                            {opcion.secciones.map((seccion) => (
                                                                <div
                                                                    key={seccion.id}
                                                                    className="border border-[#E5E7EB] rounded-lg p-3 hover:bg-[#F9FAFB] transition-colors"
                                                                >
                                                                    <div className="flex items-center justify-between mb-2">
                                                                        <div>
                                                                            <h4 className="text-base font-bold text-[#0E2B5C]">Sección {seccion.nombre}</h4>
                                                                            <p className="text-xs text-[#6B7280]">Cap: {seccion.capacidad} estudiantes</p>
                                                                        </div>
                                                                    </div>
                                                                    <button
                                                                        onClick={() => handleMatricular(opcion.grado.id, seccion.id, opcion.grado.nombre, seccion.nombre)}
                                                                        disabled={procesando}
                                                                        className="w-full px-3 py-2 bg-[#0E2B5C] hover:bg-[#1a3d6b] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                                    >
                                                                        {procesando ? 'Procesando...' : 'Matricularme'}
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
};
