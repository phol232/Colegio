# Sistema de Diseño - Colegio Federick

## Paleta de Colores

### Colores Principales
- **Rojo primario**: `#C62828` (primary)
  - Hover/Pressed: `#B71C1C` (primary-hover)
  - Deshabilitado: `#EAB0B0` (primary-disabled)
- **Azul oscuro (marca)**: `#0E2B5C` (secondary)
  - Activo: `#123766` (secondary-light)
  - Hover: `#163B73` (secondary-hover)
- **Celeste informativo**: `#17A2E5` (info)
- **Amarillo acento**: `#F4C20D` (accent)

### Neutros
- Fondo app: `#F5F7FA` (background)
- Blanco: `#FFFFFF` (background-white)
- Texto: `#1F2937` (text)
- Texto secundario: `#6B7280` (text-secondary)
- Borde sutil: `#E5E7EB` (border)

### Estados
- Éxito: `#22C55E` (success)
- Advertencia: `#F59E0B` (warning)
- Error: `#DC2626` (error)

## Componentes

### 1. Sidebar
```tsx
// Fondo
className="bg-sidebar-bg"

// Logo/título
className="text-white"

// Ítems inactivos
className="text-sidebar-item"

// Ítem activo
className="bg-sidebar-active text-white border-l-4 border-primary"

// Hover
className="hover:bg-sidebar-hover"

// Cerrar sesión
className="text-primary hover:bg-sidebar-hover"
```

### 2. Área de Contenido
```tsx
// Fondo de página
className="bg-background"

// Títulos de página
className="text-secondary text-3xl font-bold"

// Breadcrumbs/textos guía
className="text-text-secondary"
```

### 3. Tarjetas (Cards)
```tsx
// Card base
className="bg-background-white border border-border shadow-card rounded-lg"

// Título de card
className="text-secondary font-semibold"

// KPI chips/etiquetas
className="bg-info text-white px-3 py-1 rounded-full text-sm"

// Por nivel educativo:
// - Inicial: bg-accent text-secondary
// - Primaria: bg-info text-white
// - Secundaria: bg-secondary text-white
```

### 4. Botones
```tsx
// Primario (acciones clave)
className="bg-primary text-white hover:bg-primary-hover disabled:bg-primary-disabled"

// Secundario (outline)
className="border border-secondary text-secondary hover:bg-[#EEF2F7]"

// Terciario (link)
className="text-info underline-offset-4 hover:underline"
```

### 5. Textos
```tsx
// Título H1/H2
className="text-secondary text-2xl font-bold"

// Cuerpo
className="text-text"

// Secundario/placeholder
className="text-text-secondary"

// Enlaces
className="text-info hover:underline focus:underline"
```

### 6. Gráficas
- Barras/series principales: `#17A2E5` (info)
- Series comparativas: `#0E2B5C` (secondary)
- Líneas objetivo: `#F4C20D` (accent)
- **Evitar usar rojo en gráficas informativas**

## Clases de Tailwind Personalizadas

### Colores
- `bg-primary` / `text-primary` / `border-primary`
- `bg-secondary` / `text-secondary` / `border-secondary`
- `bg-info` / `text-info`
- `bg-accent` / `text-accent`
- `bg-success` / `text-success`
- `bg-warning` / `text-warning`
- `bg-error` / `text-error`
- `bg-background` / `bg-background-white`
- `text-text` / `text-text-secondary`
- `border-border`

### Sidebar
- `bg-sidebar-bg`
- `text-sidebar-item`
- `bg-sidebar-active`
- `bg-sidebar-hover`

### Sombras
- `shadow-card` (0 1px 2px rgba(0,0,0,.04))

## Ejemplos de Uso

### Botón Primario
```tsx
<button className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary-hover disabled:bg-primary-disabled transition-colors">
  Registrar Asistencia
</button>
```

### Card
```tsx
<div className="bg-background-white border border-border shadow-card rounded-lg p-6">
  <h3 className="text-secondary font-semibold text-lg mb-4">Título</h3>
  <p className="text-text">Contenido</p>
</div>
```

### Sidebar Item Activo
```tsx
<Link className="flex items-center px-4 py-3 bg-sidebar-active text-white border-l-4 border-primary">
  <span>Dashboard</span>
</Link>
```

### Badge de Nivel
```tsx
// Inicial
<span className="bg-accent text-secondary px-3 py-1 rounded-full text-xs font-medium">
  Inicial
</span>

// Primaria
<span className="bg-info text-white px-3 py-1 rounded-full text-xs font-medium">
  Primaria
</span>

// Secundaria
<span className="bg-secondary text-white px-3 py-1 rounded-full text-xs font-medium">
  Secundaria
</span>
```
