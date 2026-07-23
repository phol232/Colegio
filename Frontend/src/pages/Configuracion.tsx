import { useState, useEffect } from 'react';
import {
    Settings,
    User,
    Palette,
    Globe,
    Building2,
    Type,
    CalendarRange,
} from 'lucide-react';
import { useToastStore } from '../stores/toastStore';
import api from '../services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface Usuario {
    id: number;
    name: string;
    email: string;
    role: string;
    avatar?: string | null;
}

interface ConfiguracionSistema {
    nombre_institucion: string;
    anio_academico: number;
    periodo_evaluacion: string;
    modo_mantenimiento: boolean;
    periodo_academico_estado: string;
    matricula_inicio: string;
    matricula_fin: string;
    grado_ingreso_id: number | null;
}

interface GradoOption {
    id: number;
    nombre: string;
}

const roleLabels: Record<string, string> = {
    admin: 'Administrador',
    docente: 'Docente',
    estudiante: 'Estudiante',
    padre: 'Padre de familia',
};

const idiomaOptions = [
    { value: 'es', label: 'Español' },
    { value: 'en', label: 'English' },
    { value: 'fr', label: 'Français' },
];

const tamanoFuenteOptions = [
    { value: 'pequeno', label: 'Pequeño' },
    { value: 'mediano', label: 'Mediano' },
    { value: 'grande', label: 'Grande' },
];

const periodoEvaluacionOptions = [
    { value: 'bimestral', label: 'Bimestral' },
    { value: 'trimestral', label: 'Trimestral' },
    { value: 'semestral', label: 'Semestral' },
];

const periodoAcademicoEstadoOptions = [
    { value: 'planificacion', label: 'Planificación' },
    { value: 'matricula', label: 'Matrícula abierta' },
    { value: 'activo', label: 'Año en curso' },
    { value: 'cerrado', label: 'Cerrado' },
];

interface ToggleRowProps {
    id: string;
    title: string;
    description: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
}

const ToggleRow = ({ id, title, description, checked, onChange }: ToggleRowProps) => (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-3">
        <div>
            <p className="text-sm font-medium text-slate-900">{title}</p>
            <p className="text-xs text-slate-500">{description}</p>
        </div>
        <label htmlFor={id} className="relative inline-flex shrink-0 cursor-pointer items-center">
            <input
                id={id}
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                className="peer sr-only"
            />
            <div className="h-6 w-11 rounded-full bg-slate-200 transition-colors peer-checked:bg-sidebar-bg peer-focus-visible:ring-2 peer-focus-visible:ring-sidebar-bg peer-focus-visible:ring-offset-2 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all peer-checked:after:translate-x-5" />
        </label>
    </div>
);

export const Configuracion = () => {
    const [usuario, setUsuario] = useState<Usuario | null>(null);
    const [loading, setLoading] = useState(true);
    const [guardandoSistema, setGuardandoSistema] = useState(false);

    const [configSistema, setConfigSistema] = useState<ConfiguracionSistema>({
        nombre_institucion: 'Colegio Frederick',
        anio_academico: 2025,
        periodo_evaluacion: 'trimestral',
        modo_mantenimiento: false,
        periodo_academico_estado: 'planificacion',
        matricula_inicio: '',
        matricula_fin: '',
        grado_ingreso_id: null,
    });
    const [grados, setGrados] = useState<GradoOption[]>([]);

    const [modoOscuro, setModoOscuro] = useState(false);
    const [idioma, setIdioma] = useState('es');
    const [notificaciones, setNotificaciones] = useState(true);
    const [notificacionesEmail, setNotificacionesEmail] = useState(true);
    const [tamanoFuente, setTamanoFuente] = useState('mediano');
    
    const showToast = useToastStore((s) => s.show);

    useEffect(() => {
        cargarDatos();

        const modoOscuroGuardado = localStorage.getItem('modoOscuro') === 'true';
        const idiomaGuardado = localStorage.getItem('idioma') || 'es';
        const notificacionesGuardadas = localStorage.getItem('notificaciones') !== 'false';
        const emailNotif = localStorage.getItem('email_notifications') !== 'false';
        const tamanoFuenteGuardado = localStorage.getItem('tamanoFuente') || 'mediano';

        setModoOscuro(modoOscuroGuardado);
        setIdioma(idiomaGuardado);
        setNotificaciones(notificacionesGuardadas);
        setNotificacionesEmail(emailNotif);
        setTamanoFuente(tamanoFuenteGuardado);

        if (modoOscuroGuardado) {
            document.documentElement.classList.add('dark');
        }
    }, []);

    const cargarDatos = async () => {
        try {
            setLoading(true);
            const response = await api.get('/perfil');
            const userData = response.data.data;
            setUsuario(userData);

            if (userData.role === 'admin') {
                try {
                    const [configRes, gradosRes] = await Promise.all([
                        api.get('/admin/configuracion'),
                        api.get('/admin/grados'),
                    ]);
                    if (configRes.data.success && configRes.data.data) {
                        const d = configRes.data.data;
                        const periodo = d.periodo_academico;
                        setConfigSistema({
                            nombre_institucion: d.nombre_institucion ?? 'Colegio Frederick',
                            anio_academico: Number(d.anio_academico) || new Date().getFullYear(),
                            periodo_evaluacion: d.periodo_evaluacion ?? 'trimestral',
                            modo_mantenimiento: Boolean(d.modo_mantenimiento),
                            periodo_academico_estado: periodo?.estado ?? 'planificacion',
                            matricula_inicio: periodo?.matricula_inicio?.slice(0, 10) ?? '',
                            matricula_fin: periodo?.matricula_fin?.slice(0, 10) ?? '',
                            grado_ingreso_id: d.grado_ingreso_id != null ? Number(d.grado_ingreso_id) : null,
                        });
                    }
                    if (gradosRes.data.success) {
                        setGrados(
                            (gradosRes.data.data ?? []).map((g: GradoOption) => ({
                                id: Number(g.id),
                                nombre: g.nombre,
                            })),
                        );
                    }
                } catch {
                    // Usar valores por defecto si no hay configuración
                }
            }
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            showToast(err.response?.data?.message || 'Error al cargar datos', 'error', 3500, 'Error');
        } finally {
            setLoading(false);
        }
    };

    const handleActualizarSistema = async (e: React.FormEvent) => {
        e.preventDefault();
        setGuardandoSistema(true);
        try {
            await api.put('/admin/configuracion', {
                nombre_institucion: configSistema.nombre_institucion,
                anio_academico: configSistema.anio_academico,
                periodo_evaluacion: configSistema.periodo_evaluacion,
                modo_mantenimiento: configSistema.modo_mantenimiento,
                periodo_academico_estado: configSistema.periodo_academico_estado,
                matricula_inicio: configSistema.matricula_inicio || null,
                matricula_fin: configSistema.matricula_fin || null,
                grado_ingreso_id: configSistema.grado_ingreso_id,
            });
            showToast('Los ajustes del sistema se guardaron correctamente.', 'success', 3500, 'Configuración actualizada');
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            showToast(err.response?.data?.message || 'Error al actualizar configuración', 'error', 3500, 'Error');
        } finally {
            setGuardandoSistema(false);
        }
    };

    const handleCambiarModoOscuro = (activado: boolean) => {
        setModoOscuro(activado);
        localStorage.setItem('modoOscuro', activado ? 'true' : 'false');
        localStorage.setItem('tema', activado ? 'oscuro' : 'claro');

        const html = document.documentElement;
        const body = document.body;

        if (activado) {
            html.style.backgroundColor = '#0f172a';
            body.style.backgroundColor = '#0f172a';
            body.style.color = '#e2e8f0';
        } else {
            html.style.backgroundColor = '';
            body.style.backgroundColor = '';
            body.style.color = '';
        }

        showToast(`Modo ${activado ? 'oscuro' : 'claro'} activado.`, 'success', 3500, 'Preferencia guardada');
    };

    const handleCambiarIdioma = (nuevoIdioma: string) => {
        setIdioma(nuevoIdioma);
        localStorage.setItem('idioma', nuevoIdioma);
        const label = idiomaOptions.find((o) => o.value === nuevoIdioma)?.label ?? nuevoIdioma;
        showToast(`Idioma cambiado a ${label}. Se aplicará en la próxima actualización.`, 'success', 3500, 'Idioma configurado');
    };

    const handleCambiarNotificaciones = (activado: boolean) => {
        setNotificaciones(activado);
        localStorage.setItem('notificaciones', activado ? 'true' : 'false');
        showToast(`Notificaciones ${activado ? 'activadas' : 'desactivadas'}.`, 'info', 3500, 'Preferencia guardada');
    };

    const handleCambiarNotificacionesEmail = (activado: boolean) => {
        setNotificacionesEmail(activado);
        localStorage.setItem('email_notifications', activado ? 'true' : 'false');
        showToast(`Notificaciones por email ${activado ? 'activadas' : 'desactivadas'}.`, 'success', 3500, 'Preferencia guardada');
    };

    const handleCambiarTamanoFuente = (tamano: string) => {
        setTamanoFuente(tamano);
        localStorage.setItem('tamanoFuente', tamano);

        const root = document.documentElement;
        switch (tamano) {
            case 'pequeno':
                root.style.fontSize = '14px';
                break;
            case 'grande':
                root.style.fontSize = '18px';
                break;
            default:
                root.style.fontSize = '16px';
        }

        const label = tamanoFuenteOptions.find((o) => o.value === tamano)?.label ?? tamano;
        showToast(`Tamaño de fuente: ${label}.`, 'success', 3500, 'Preferencia guardada');
    };

    if (loading) {
        return (
            <>
                <div className="flex h-[60vh] items-center justify-center">
                    <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-sidebar-bg" />
                </div>
            </>
        );
    }

    return (
        <>
            <div className="flex justify-center px-4 py-8 md:px-6">
                <div className="w-full max-w-5xl">
                    <div className="mb-8 text-center">
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
                            Configuración
                        </h1>
                        <p className="mt-2 text-sm text-slate-500 md:text-base">
                            Personaliza tu experiencia y ajustes del sistema
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
                        {/* Cuenta */}
                        <div className="lg:col-span-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <User className="h-5 w-5 text-sidebar-bg" />
                                        Tu cuenta
                                    </CardTitle>
                                    <CardDescription>Información de la sesión actual</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center gap-4">
                                        {usuario?.avatar ? (
                                            <img
                                                src={usuario.avatar}
                                                alt={usuario.name}
                                                className="h-16 w-16 rounded-full border-2 border-slate-200 object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-sidebar-bg text-xl font-bold text-white">
                                                {usuario?.name.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <div className="min-w-0">
                                            <p className="truncate font-semibold text-slate-900">{usuario?.name}</p>
                                            <p className="truncate text-sm text-slate-500">{usuario?.email}</p>
                                            <span className="mt-2 inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                                                {roleLabels[usuario?.role ?? ''] ?? usuario?.role}
                                            </span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Apariencia */}
                        <div className="lg:col-span-3">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Palette className="h-5 w-5 text-sidebar-bg" />
                                        Apariencia
                                    </CardTitle>
                                    <CardDescription>Ajusta el aspecto visual de la aplicación</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <ToggleRow
                                        id="modo-oscuro"
                                        title="Modo oscuro"
                                        description="Cambia la apariencia de la interfaz"
                                        checked={modoOscuro}
                                        onChange={handleCambiarModoOscuro}
                                    />

                                    <div className="rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-3">
                                        <div className="mb-3 flex items-center gap-2">
                                            <Type className="h-4 w-4 text-slate-500" />
                                            <p className="text-sm font-medium text-slate-900">Tamaño de fuente</p>
                                        </div>
                                        <div className="flex gap-2">
                                            {tamanoFuenteOptions.map((opt) => (
                                                <button
                                                    key={opt.value}
                                                    type="button"
                                                    onClick={() => handleCambiarTamanoFuente(opt.value)}
                                                    className={cn(
                                                        'flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                                                        tamanoFuente === opt.value
                                                            ? 'border-sidebar-bg bg-sidebar-bg text-white'
                                                            : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
                                                    )}
                                                >
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Idioma y notificaciones */}
                        <div className="lg:col-span-5">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Globe className="h-5 w-5 text-sidebar-bg" />
                                        Idioma y notificaciones
                                    </CardTitle>
                                    <CardDescription>Preferencias de comunicación y localización</CardDescription>
                                </CardHeader>
                                <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2">
                                            <Globe className="h-4 w-4 text-slate-400" />
                                            Idioma de la aplicación
                                        </Label>
                                        <Select value={idioma} onValueChange={handleCambiarIdioma}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seleccionar idioma" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {idiomaOptions.map((opt) => (
                                                    <SelectItem key={opt.value} value={opt.value}>
                                                        {opt.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-4 md:col-span-1">
                                        <ToggleRow
                                            id="notif-push"
                                            title="Notificaciones push"
                                            description="Alertas sobre actividades importantes"
                                            checked={notificaciones}
                                            onChange={handleCambiarNotificaciones}
                                        />
                                        <ToggleRow
                                            id="notif-email"
                                            title="Notificaciones por email"
                                            description="Resúmenes y avisos por correo"
                                            checked={notificacionesEmail}
                                            onChange={handleCambiarNotificacionesEmail}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Sistema (admin) */}
                        {usuario?.role === 'admin' && (
                            <div className="lg:col-span-5">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Building2 className="h-5 w-5 text-sidebar-bg" />
                                            Configuración del sistema
                                        </CardTitle>
                                        <CardDescription>
                                            Parámetros institucionales del colegio
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <form id="config-sistema-form" onSubmit={handleActualizarSistema} className="grid grid-cols-1 gap-5 md:grid-cols-2">
                                            <div className="space-y-2 md:col-span-2">
                                                <Label htmlFor="nombre_institucion">Nombre de la institución</Label>
                                                <Input
                                                    id="nombre_institucion"
                                                    value={configSistema.nombre_institucion}
                                                    onChange={(e) =>
                                                        setConfigSistema({
                                                            ...configSistema,
                                                            nombre_institucion: e.target.value,
                                                        })
                                                    }
                                                />
                                            </div>

                                            <div className="md:col-span-2 rounded-lg border border-slate-200 bg-slate-50/60 p-4">
                                                <div className="mb-4 flex items-center gap-2">
                                                    <CalendarRange className="h-4 w-4 text-sidebar-bg" />
                                                    <div>
                                                        <p className="text-sm font-semibold text-slate-900">
                                                            Período académico
                                                        </p>
                                                        <p className="text-xs text-slate-500">
                                                            Controla el año lectivo y la ventana de matrícula
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="anio_academico">Año académico</Label>
                                                        <Input
                                                            id="anio_academico"
                                                            type="number"
                                                            value={configSistema.anio_academico}
                                                            onChange={(e) =>
                                                                setConfigSistema({
                                                                    ...configSistema,
                                                                    anio_academico:
                                                                        parseInt(e.target.value, 10) ||
                                                                        configSistema.anio_academico,
                                                                })
                                                            }
                                                        />
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label>Estado del período</Label>
                                                        <Select
                                                            value={configSistema.periodo_academico_estado}
                                                            onValueChange={(value) =>
                                                                setConfigSistema({
                                                                    ...configSistema,
                                                                    periodo_academico_estado: value,
                                                                })
                                                            }
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Seleccionar estado" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {periodoAcademicoEstadoOptions.map((opt) => (
                                                                    <SelectItem key={opt.value} value={opt.value}>
                                                                        {opt.label}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label htmlFor="matricula_inicio">Inicio de matrícula</Label>
                                                        <Input
                                                            id="matricula_inicio"
                                                            type="date"
                                                            value={configSistema.matricula_inicio}
                                                            onChange={(e) =>
                                                                setConfigSistema({
                                                                    ...configSistema,
                                                                    matricula_inicio: e.target.value,
                                                                })
                                                            }
                                                        />
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label htmlFor="matricula_fin">Fin de matrícula</Label>
                                                        <Input
                                                            id="matricula_fin"
                                                            type="date"
                                                            value={configSistema.matricula_fin}
                                                            onChange={(e) =>
                                                                setConfigSistema({
                                                                    ...configSistema,
                                                                    matricula_fin: e.target.value,
                                                                })
                                                            }
                                                        />
                                                    </div>

                                                    <div className="space-y-2 md:col-span-2">
                                                        <Label>Grado de ingreso (estudiantes nuevos)</Label>
                                                        <Select
                                                            value={
                                                                configSistema.grado_ingreso_id != null
                                                                    ? String(configSistema.grado_ingreso_id)
                                                                    : 'ninguno'
                                                            }
                                                            onValueChange={(value) =>
                                                                setConfigSistema({
                                                                    ...configSistema,
                                                                    grado_ingreso_id:
                                                                        value === 'ninguno' ? null : Number(value),
                                                                })
                                                            }
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Seleccionar grado" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="ninguno">Sin definir</SelectItem>
                                                                {grados.map((grado) => (
                                                                    <SelectItem key={grado.id} value={String(grado.id)}>
                                                                        {grado.nombre}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-2 md:col-span-2">
                                                <Label>Período de evaluación (notas)</Label>
                                                <Select
                                                    value={configSistema.periodo_evaluacion}
                                                    onValueChange={(value) =>
                                                        setConfigSistema({
                                                            ...configSistema,
                                                            periodo_evaluacion: value,
                                                        })
                                                    }
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Seleccionar período" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {periodoEvaluacionOptions.map((opt) => (
                                                            <SelectItem key={opt.value} value={opt.value}>
                                                                {opt.label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="md:col-span-2">
                                                <div className="flex items-center justify-between gap-4 rounded-lg border border-amber-200 bg-amber-50/80 px-4 py-3">
                                                    <div>
                                                        <p className="text-sm font-medium text-amber-900">
                                                            Modo mantenimiento
                                                        </p>
                                                        <p className="text-xs text-amber-700">
                                                            Desactiva el acceso al sistema temporalmente
                                                        </p>
                                                    </div>
                                                    <label htmlFor="modo-mantenimiento" className="relative inline-flex shrink-0 cursor-pointer items-center">
                                                        <input
                                                            id="modo-mantenimiento"
                                                            type="checkbox"
                                                            checked={configSistema.modo_mantenimiento}
                                                            onChange={(e) =>
                                                                setConfigSistema({
                                                                    ...configSistema,
                                                                    modo_mantenimiento: e.target.checked,
                                                                })
                                                            }
                                                            className="peer sr-only"
                                                        />
                                                        <div className="h-6 w-11 rounded-full bg-slate-200 transition-colors peer-checked:bg-amber-600 peer-focus-visible:ring-2 peer-focus-visible:ring-amber-500 peer-focus-visible:ring-offset-2 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all peer-checked:after:translate-x-5" />
                                                    </label>
                                                </div>
                                            </div>
                                        </form>
                                    </CardContent>
                                    <CardFooter className="justify-end">
                                        <Button type="submit" form="config-sistema-form" disabled={guardandoSistema}>
                                            <Settings className="h-4 w-4" />
                                            {guardandoSistema ? 'Guardando...' : 'Guardar configuración'}
                                        </Button>
                                    </CardFooter>
                                </Card>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};
