# Frontend - Sistema de Gestión Académica

Aplicación React con TypeScript, Tailwind CSS y Zustand para el sistema de gestión académica.

## Tecnologías

- **React 18** - Framework UI
- **TypeScript** - Tipado estático
- **Tailwind CSS** - Estilos
- **Vite** - Build tool
- **React Router** - Navegación
- **Zustand** - State management
- **Axios** - HTTP client

## Instalación

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Build para producción
npm run build

# Preview del build
npm run preview
```

## Estructura del Proyecto

```
src/
├── components/       # Componentes reutilizables
├── pages/           # Páginas/Vistas
├── services/        # Servicios API
├── stores/          # Zustand stores
├── types/           # TypeScript types
├── App.tsx          # Componente principal
├── main.tsx         # Entry point
└── index.css        # Estilos globales
```

## Características

- ✅ Autenticación con email/password
- ✅ Registro de usuarios
- ✅ Rutas protegidas por rol
- ✅ Diseño responsive
- ✅ Tema personalizado con colores del colegio
- ✅ Manejo de errores
- ✅ Loading states
- ✅ Interceptores de Axios

## Roles de Usuario

- **Docente**: Registra asistencias y notas
- **Estudiante**: Consulta su información académica
- **Padre**: Consulta información de sus hijos
- **Admin**: Acceso completo al sistema

## Variables de Entorno

Crear archivo `.env` en la raíz del proyecto:

```env
VITE_API_URL=http://localhost:80/api
```

## Desarrollo

El servidor de desarrollo se ejecuta en `http://localhost:3000` con proxy configurado para `/api` hacia el backend.
