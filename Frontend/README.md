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
corepack enable
pnpm install

# Iniciar servidor de desarrollo
pnpm run dev

# Build para producción
pnpm run build

# Preview del build
pnpm run preview
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
VITE_API_URL=https://api.example.com/api
```

Si no se define `VITE_API_URL`, el cliente utiliza `/api`, lo que permite
seguir usando el proxy local de Vite y el stack Docker.

## Despliegue en Vercel

1. Importar el repositorio en Vercel.
2. Configurar `Frontend` como **Root Directory**.
3. Agregar `VITE_API_URL=https://api.example.com/api` en las variables de
   Production, Preview y Development.
4. Desplegar. Vercel detectará pnpm y utilizará `vercel.json` para construir
   `dist` y redirigir las rutas de React Router hacia `index.html`.
5. Agregar el dominio final de Vercel a `CORS_ORIGIN` en el backend y volver a
   desplegarlo.

No deben guardarse secretos en variables que comiencen con `VITE_`: estas
variables forman parte del JavaScript público generado.

## Docker

El frontend se construye y sirve como contenedor (`frontend` en `docker-compose.yml`):

```bash
docker compose build frontend
docker compose up -d frontend
```

La imagen usa build multi-stage: `pnpm build` (Vite) + nginx alpine para archivos estáticos.

## Desarrollo local

El servidor de desarrollo se ejecuta en `http://localhost:3000` con proxy configurado para `/api` hacia el backend.
