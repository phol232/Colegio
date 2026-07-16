export { ATTENDANCE_REPOSITORY } from './tokens';
import { AttendanceSummary } from '../services/attendance-calculator.service';

export type AttendanceStatus = 'presente' | 'ausente' | 'tardanza';

export interface AttendanceRecord {
  id: number;
  estudianteId: number;
  cursoId: number;
  fecha: string;
  estado: AttendanceStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AttendanceBulkItem {
  estudianteId: number;
  estado: AttendanceStatus;
}

export interface ListAttendanceFilters {
  estudianteId?: number;
  cursoId?: number;
  fecha?: string;
  fechaInicio?: string;
  fechaFin?: string;
  estado?: AttendanceStatus;
  page?: number;
  perPage?: number;
}

export interface PaginatedAttendance {
  data: AttendanceRecord[];
  total: number;
  page: number;
  perPage: number;
  lastPage: number;
}

export interface CourseAttendanceSummary {
  totalClases: number;
  porcentajeAsistencia: number;
  totalPresentes: number;
  totalAusentes: number;
  totalTardanzas: number;
}

export interface IAttendanceRepository {
  bulkUpsert(
    cursoId: number,
    fecha: string,
    registros: AttendanceBulkItem[],
  ): Promise<{ success: boolean; message?: string; inserted?: number }>;
  updateStatus(id: number, estado: AttendanceStatus): Promise<AttendanceRecord | null>;
  list(filters: ListAttendanceFilters): Promise<PaginatedAttendance>;
  getStudentCourseSummary(
    estudianteId: number,
    cursoId: number,
  ): Promise<AttendanceSummary>;
  getByCourseAndDate(cursoId: number, fecha: string): Promise<AttendanceRecord[]>;
  getByStudentMonth(estudianteId: number, mes: number): Promise<AttendanceRecord[]>;
  getByStudent(estudianteId: number): Promise<AttendanceRecord[]>;
  getByStudentCourse(
    estudianteId: number,
    cursoId: number,
  ): Promise<AttendanceRecord[]>;
  getCourseSummary(cursoId: number): Promise<CourseAttendanceSummary>;
}
