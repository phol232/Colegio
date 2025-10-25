export interface User {
  id: number;
  name: string;
  email: string;
  role: 'docente' | 'estudiante' | 'padre' | 'admin';
  avatar?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User, token: string) => void;
}

export interface Asistencia {
  id: number;
  estudiante_id: number;
  curso_id: number;
  fecha: string;
  estado: 'presente' | 'ausente' | 'tardanza';
  created_at: string;
}

export interface Nota {
  id: number;
  estudiante_id: number;
  curso_id: number;
  unidad: number;
  puntaje: number;
  created_at: string;
}

export interface Curso {
  id: number;
  nombre: string;
  codigo: string;
  docente_id: number;
}

export interface ResumenAsistencia {
  total_clases: number;
  presentes: number;
  ausentes: number;
  tardanzas: number;
  porcentaje: number;
}

export interface ResumenNotas {
  promedio_general: number;
  unidad_1: number | null;
  unidad_2: number | null;
  unidad_3: number | null;
  unidad_4: number | null;
  total_notas: number;
}
