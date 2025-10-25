# Actualización de Modales - Diseño Profesional

## Cambios Necesarios

### 1. Modal de Registro de Asistencia

#### Header del Modal
```tsx
// Cambiar de verde a color del curso
<div className="px-6 py-4 border-b border-[#E5E7EB]" style={{ backgroundColor: courseColor.light }}>
    <div className="flex justify-between items-center">
        <div>
            <h2 className="text-2xl font-bold text-[#0E2B5C]">
                {cursoSeleccionado.nombre}
            </h2>
            <p className="text-sm text-[#6B7280] mt-1">
                {cursoSeleccionado.codigo} - {cursoSeleccionado.grado} {cursoSeleccionado.seccion}
            </p>
        </div>
        <button onClick={cerrarModal} className="text-[#6B7280] hover:text-[#1F2937]">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
        </button>
    </div>
</div>
```

#### Estadísticas (Presentes/Tardanzas/Ausentes)
```tsx
<div className="px-6 py-4 bg-white border-b border-[#E5E7EB]">
    <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#F0FDF4] border border-[#22C55E] rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-[#22C55E]">{presentes}</p>
            <p className="text-sm text-[#6B7280] mt-1">Presentes</p>
        </div>
        <div className="bg-[#FFFBEB] border border-[#F59E0B] rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-[#F59E0B]">{tardanzas}</p>
            <p className="text-sm text-[#6B7280] mt-1">Tardanzas</p>
        </div>
        <div className="bg-[#FEF2F2] border border-[#DC2626] rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-[#DC2626]">{ausentes}</p>
            <p className="text-sm text-[#6B7280] mt-1">Ausentes</p>
        </div>
    </div>
</div>
```

#### Lista de Estudiantes
```tsx
<div className="flex-1 overflow-y-auto px-6 py-4">
    {estudiantes.map((estudiante, index) => (
        <div key={estudiante.id} className="bg-white border border-[#E5E7EB] rounded-lg p-4 mb-3 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-[#6B7280] w-8">{index + 1}</span>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" 
                         style={{ backgroundColor: courseColor.primary }}>
                        {estudiante.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <p className="font-medium text-[#1F2937]">{estudiante.name}</p>
                        <p className="text-xs text-[#6B7280]">{estudiante.email}</p>
                    </div>
                </div>
                
                <div className="flex gap-2">
                    <button className="px-4 py-2 bg-[#F0FDF4] border border-[#22C55E] text-[#22C55E] rounded-lg hover:bg-[#22C55E] hover:text-white transition-colors">
                        ✓ Presente
                    </button>
                    <button className="px-4 py-2 bg-[#FFFBEB] border border-[#F59E0B] text-[#F59E0B] rounded-lg hover:bg-[#F59E0B] hover:text-white transition-colors">
                        ⏰ Tardanza
                    </button>
                    <button className="px-4 py-2 bg-[#FEF2F2] border border-[#DC2626] text-[#DC2626] rounded-lg hover:bg-[#DC2626] hover:text-white transition-colors">
                        ✗ Ausente
                    </button>
                </div>
            </div>
        </div>
    ))}
</div>
```

#### Footer con Botones
```tsx
<div className="px-6 py-4 bg-[#F5F7FA] border-t border-[#E5E7EB] flex justify-between items-center">
    <div className="text-sm text-[#6B7280]">
        Total: {estudiantes.length} estudiantes
    </div>
    <div className="flex gap-3">
        <button 
            onClick={cerrarModal}
            className="px-6 py-2 border border-[#E5E7EB] text-[#6B7280] rounded-lg hover:bg-white transition-colors">
            Cancelar
        </button>
        <button 
            onClick={guardarAsistencia}
            disabled={guardando}
            className="px-6 py-2 bg-[#C62828] hover:bg-[#B71C1C] text-white rounded-lg transition-colors disabled:bg-[#EAB0B0] disabled:cursor-not-allowed">
            {guardando ? 'Guardando...' : 'Guardar Asistencia'}
        </button>
    </div>
</div>
```

### 2. Modal de Registro de Notas

#### Header del Modal
```tsx
<div className="px-6 py-4 border-b border-[#E5E7EB]" style={{ backgroundColor: courseColor.light }}>
    <div className="flex justify-between items-center">
        <div>
            <h2 className="text-2xl font-bold text-[#0E2B5C]">Registrar Notas</h2>
            <p className="text-sm text-[#6B7280] mt-1">
                {cursoSeleccionado.codigo} - {cursoSeleccionado.nombre} - Unidad {unidadSeleccionada}
            </p>
        </div>
        <button onClick={cerrarModal} className="text-[#6B7280] hover:text-[#1F2937]">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
        </button>
    </div>
</div>
```

#### Info Banner
```tsx
<div className="px-6 py-3 bg-[#EFF6FF] border-b border-[#17A2E5]">
    <p className="text-sm text-[#0E2B5C]">
        {esPrimaria() ? (
            <>ℹ️ Calificaciones: AD (Logro destacado), A (Logro esperado), B (En proceso), C (En inicio)</>
        ) : (
            <>ℹ️ Las notas deben estar en el rango de 0 a 20. Nota mínima aprobatoria: 11</>
        )}
    </p>
</div>
```

#### Lista de Estudiantes
```tsx
<div className="flex-1 overflow-y-auto px-6 py-4">
    {estudiantes.map((estudiante, index) => (
        <div key={estudiante.id} className="bg-white border border-[#E5E7EB] rounded-lg p-4 mb-3 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1">
                    <span className="text-sm font-medium text-[#6B7280] w-8">{index + 1}</span>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" 
                         style={{ backgroundColor: courseColor.primary }}>
                        {estudiante.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                        <p className="font-medium text-[#1F2937]">{estudiante.name}</p>
                        <p className="text-xs text-[#6B7280]">{estudiante.email}</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {esPrimaria() ? (
                        <select className="w-32 px-3 py-2 border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#17A2E5]">
                            <option value="">Seleccionar</option>
                            <option value="AD">AD</option>
                            <option value="A">A</option>
                            <option value="B">B</option>
                            <option value="C">C</option>
                        </select>
                    ) : (
                        <input 
                            type="number" 
                            min="0" 
                            max="20" 
                            step="0.5"
                            placeholder="0-20"
                            className="w-24 px-3 py-2 border border-[#E5E7EB] rounded-lg text-center focus:ring-2 focus:ring-[#17A2E5]"
                        />
                    )}
                    <span className="text-sm font-medium text-[#6B7280] w-32 text-right">
                        {estado.texto}
                    </span>
                </div>
            </div>
        </div>
    ))}
</div>
```

#### Footer
```tsx
<div className="px-6 py-4 bg-[#F5F7FA] border-t border-[#E5E7EB] flex justify-between items-center">
    <div className="text-sm text-[#6B7280]">
        {estadisticas.total > 0 && (
            <span>
                Promedio: <span className="font-semibold text-[#0E2B5C]">{estadisticas.promedio.toFixed(2)}</span> | 
                Aprobados: <span className="font-semibold text-[#22C55E]">{estadisticas.aprobados}</span> | 
                Desaprobados: <span className="font-semibold text-[#DC2626]">{estadisticas.desaprobados}</span>
            </span>
        )}
    </div>
    <div className="flex gap-3">
        <button 
            onClick={cerrarModal}
            className="px-6 py-2 border border-[#E5E7EB] text-[#6B7280] rounded-lg hover:bg-white transition-colors">
            Cancelar
        </button>
        <button 
            onClick={guardarNotas}
            disabled={guardando}
            className="px-6 py-2 bg-[#C62828] hover:bg-[#B71C1C] text-white rounded-lg transition-colors disabled:bg-[#EAB0B0] disabled:cursor-not-allowed">
            {guardando ? 'Guardando...' : 'Guardar Notas'}
        </button>
    </div>
</div>
```

### 3. Tarjetas de Cursos

#### Importar utilidad de colores
```tsx
import { getCourseColor } from '../../utils/courseColors';
```

#### Aplicar color a cada tarjeta
```tsx
{cursos.map((curso) => {
    const courseColor = getCourseColor(curso.nombre);
    
    return (
        <div key={curso.id} className="bg-white rounded-xl shadow border border-[#E5E7EB] overflow-hidden hover:shadow-lg transition-all">
            {/* Header con color del curso */}
            <div className="p-5 border-b border-[#E5E7EB]" style={{ backgroundColor: courseColor.light }}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                             style={{ backgroundColor: courseColor.primary }}>
                            {curso.nombre.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-[#0E2B5C]">{curso.nombre}</h3>
                            <p className="text-xs text-[#6B7280]">{curso.codigo}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Contenido */}
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

                {/* Botón rojo institucional */}
                <button
                    onClick={() => abrirModal(curso)}
                    className="w-full bg-[#C62828] hover:bg-[#B71C1C] text-white py-2.5 px-4 rounded-lg transition-colors font-semibold text-sm flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    <span>Registrar</span>
                </button>
            </div>
        </div>
    );
})}
```

## Resumen de Colores

- **Botones de acción**: `#C62828` (rojo institucional)
- **Hover botones**: `#B71C1C`
- **Disabled**: `#EAB0B0`
- **Títulos**: `#0E2B5C` (azul oscuro)
- **Texto**: `#1F2937`
- **Texto secundario**: `#6B7280`
- **Bordes**: `#E5E7EB`
- **Fondo**: `#F5F7FA`
- **Cada curso**: Color específico de la tabla
