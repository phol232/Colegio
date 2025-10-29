import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { getCourseColor } from '../../utils/courseColors';
import api from '../../services/api';

interface MesSelectorProps {
    cursoId: number;
    onMesSeleccionado: (cursoId: number, mes: number) => void;
}

const MesSelector: React.FC<MesSelectorProps> = ({ cursoId, onMesSeleccionado }) => {
    const [mesSeleccionado, setMesSeleccionado] = useState<string>('');

    const meses = [
        { valor: '3', nombre: 'Marzo' },
        { valor: '4', nombre: 'Abril' },
        { valor: '5', nombre: 'Mayo' },
        { valor: '6', nombre: 'Junio' },
        { valor: '7', nombre: 'Julio' },
        { valor: '8', nombre: 'Agosto' },
        { valor: '9', nombre: 'Septiembre' },
        { valor: '10', nombre: 'Octubre' },
        { valor: '11', nombre: 'Noviembre' },
        { valor: '12', nombre: 'Diciembre' }
    ];

    const handleMesChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setMesSeleccionado(e.target.value);
    };

    const handleNotasClick = () => {
        if (mesSeleccionado) {
            onMesSeleccionado(cursoId, parseInt(mesSeleccionado));
        } else {
            alert('Por favor selecciona un mes');
        }
    };

    return (
        <div className="space-y-2">
            <p className="text-xs font-medium text-[#6B7280]">Seleccionar mes:</p>
            <select 
                className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#C62828] text-xs"
                value={mesSeleccionado}
                onChange={handleMesChange}
            >
                <option value="">Selecciona un mes</option>
                {meses.map(mes => (
                    <option key={mes.valor} value={mes.valor}>{mes.nombre}</option>
                ))}
            </select>
            {mesSeleccionado && (
                <button
                    onClick={handleNotasClick}
                    className="w-full px-3 py-2 bg-[#C62828] hover:bg-[#B71C1C] text-white rounded-lg transition-colors font-semibold text-xs"
                >
                    Notas
                </button>
            )}
        </div>
    );
};

interface Curso {
    id: number;
    nombre: string;
    codigo: string;
    grado: string;
    seccion: string;
}

export const NotasIndex = () => {
    const navigate = useNavigate();
    const [cursos, setCursos] = useState<Curso[]>([]);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState('');
    const [filtroNivel, setFiltroNivel] = useState<'todos' | 'primaria' | 'secundaria'>('todos');

    useEffect(() => {
        cargarCursosDocente();
    }, []);

    const cargarCursosDocente = async () => {
        try {
            const response = await api.get('/docente/cursos');
            setCursos(response.data.data || []);
        } catch (error) {
            console.error('Error al cargar cursos:', error);
        } finally {
            setLoading(false);
        }
    };

    const abrirRegistroMes = (cursoId: number, mes: number) => {
        navigate(`/docente/notas/curso/${cursoId}/mes/${mes}`);
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
            <div className="p-6 bg-[#F4F6F8] min-h-screen">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-[#1E1E1E]">Registro de Notas</h1>
                    <p className="text-sm text-[#7A7A7A]">Selecciona un curso para registrar las calificaciones</p>
                </div>

                <div className="mb-4 bg-white rounded-lg shadow border border-[#E5E7EB] p-4">
                    <div className="flex items-center space-x-4">
                        <div className="flex-1 relative">
                            <input
                                type="text"
                                placeholder="Buscar curso..."
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#17A2E5] text-sm"
                            />
                            <svg className="w-5 h-5 text-[#7A7A7A] absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>

                        <div className="flex items-center space-x-2">
                            {['todos', 'primaria', 'secundaria'].map((nivel) => (
                                <button
                                    key={nivel}
                                    onClick={() => setFiltroNivel(nivel as any)}
                                    className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${filtroNivel === nivel
                                        ? 'bg-[#C62828] text-white'
                                        : 'bg-[#F5F7FA] text-[#6B7280] hover:bg-[#E5E7EB]'
                                        }`}
                                >
                                    {nivel.charAt(0).toUpperCase() + nivel.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {cursos
                        .filter(curso => {
                            const coincideBusqueda = curso.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
                                curso.codigo.toLowerCase().includes(busqueda.toLowerCase());

                            let coincideNivel = true;
                            if (filtroNivel === 'primaria') {
                                coincideNivel = curso.grado.toLowerCase().includes('primaria');
                            } else if (filtroNivel === 'secundaria') {
                                coincideNivel = curso.grado.toLowerCase().includes('secundaria');
                            }

                            return coincideBusqueda && coincideNivel;
                        })
                        .map((curso) => {
                            const courseColor = getCourseColor(curso.nombre);

                            return (
                                <div key={curso.id} className="bg-white rounded-xl shadow border border-[#E5E7EB] overflow-hidden hover:shadow-lg transition-all">
                                    <div className="p-5 border-b border-[#E5E7EB]" style={{ backgroundColor: courseColor.light }}>
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                                                style={{ backgroundColor: courseColor.primary }}
                                            >
                                                {curso.nombre.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <h3 className="text-base font-bold text-[#0E2B5C]">{curso.nombre}</h3>
                                                <p className="text-xs text-[#6B7280]">{curso.codigo}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-4">
                                        <div className="flex items-center justify-between mb-4">
                                            <div>
                                                <p className="text-xs text-[#6B7280]">Grado</p>
                                                <p className="text-sm font-bold text-[#1F2937]">{curso.grado}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-[#6B7280]">Sección</p>
                                                <p className="text-sm font-bold text-[#1F2937]">{curso.seccion}</p>
                                            </div>
                                        </div>

                                        <MesSelector cursoId={curso.id} onMesSeleccionado={abrirRegistroMes} />
                                    </div>
                                </div>
                            );
                        })}
                </div>
            </div>
        </Layout>
    );
};