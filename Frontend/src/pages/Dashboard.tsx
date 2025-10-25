import { useAuthStore } from '../stores/authStore';
import { Layout } from '../components/Layout';

export const Dashboard = () => {
  const { user } = useAuthStore();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  // Datos simulados para las estadísticas
  const stats = [
    {
      name: 'Total Estudiantes',
      value: '1,284',
      change: '+8.7%',
      trend: 'up',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      color: 'bg-[#17A2E5]'
    },
    {
      name: 'Asistencia Promedio',
      value: '92.5%',
      change: '+2.3%',
      trend: 'up',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'bg-[#22C55E]'
    },
    {
      name: 'Promedio General',
      value: '15.8',
      change: '+0.5',
      trend: 'up',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      color: 'bg-[#0E2B5C]'
    },
    {
      name: 'Cursos Activos',
      value: '24',
      change: '+3',
      trend: 'up',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      color: 'bg-[#F4C20D]'
    }
  ];

  return (
    <Layout>
      {/* Header */}
      <div className="bg-white border-b border-[#E5E7EB] px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#0E2B5C]">Dashboard</h1>
            <p className="text-sm text-[#6B7280] mt-1">Bienvenido, {user.name}</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar..."
                className="pl-10 pr-4 py-2 border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#17A2E5] focus:border-transparent"
              />
              <svg className="w-5 h-5 text-[#6B7280] absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white rounded-lg shadow border border-[#E5E7EB] p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`${stat.color} p-3 rounded-lg text-white`}>
                  {stat.icon}
                </div>
                <span className={`text-sm font-medium ${stat.trend === 'up' ? 'text-[#22C55E]' : 'text-[#DC2626]'}`}>
                  {stat.change}
                </span>
              </div>
              <h3 className="text-2xl font-bold text-[#1F2937]">{stat.value}</h3>
              <p className="text-sm text-[#6B7280] mt-1">{stat.name}</p>
            </div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Attendance Chart */}
          <div className="bg-white rounded-lg shadow border border-[#E5E7EB] p-6">
            <h3 className="text-lg font-semibold text-[#0E2B5C] mb-4">Asistencia Mensual</h3>
            <div className="h-64 flex items-end justify-between space-x-2">
              {[85, 92, 88, 95, 90, 93, 89, 94, 91, 96, 92, 95].map((value, index) => (
                <div key={index} className="flex-1 bg-[#17A2E5] rounded-t" style={{ height: `${value}%` }}></div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-xs text-[#6B7280]">
              <span>Ene</span>
              <span>Feb</span>
              <span>Mar</span>
              <span>Abr</span>
              <span>May</span>
              <span>Jun</span>
              <span>Jul</span>
              <span>Ago</span>
              <span>Sep</span>
              <span>Oct</span>
              <span>Nov</span>
              <span>Dic</span>
            </div>
          </div>

          {/* Performance Chart */}
          <div className="bg-white rounded-lg shadow border border-[#E5E7EB] p-6">
            <h3 className="text-lg font-semibold text-[#0E2B5C] mb-4">Rendimiento por Curso</h3>
            <div className="space-y-4">
              {[
                { name: 'Matemáticas', value: 95, color: 'bg-[#17A2E5]' },
                { name: 'Comunicación', value: 88, color: 'bg-[#0E2B5C]' },
                { name: 'Ciencias', value: 92, color: 'bg-[#17A2E5]' },
                { name: 'Historia', value: 85, color: 'bg-[#0E2B5C]' },
                { name: 'Inglés', value: 90, color: 'bg-[#17A2E5]' }
              ].map((course, index) => (
                <div key={index}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-[#1F2937]">{course.name}</span>
                    <span className="font-medium text-[#1F2937]">{course.value}%</span>
                  </div>
                  <div className="w-full bg-[#E5E7EB] rounded-full h-2">
                    <div className={`${course.color} h-2 rounded-full`} style={{ width: `${course.value}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow border border-[#E5E7EB]">
          <div className="px-6 py-4 border-b border-[#E5E7EB]">
            <h3 className="text-lg font-semibold text-[#0E2B5C]">Actividad Reciente</h3>
          </div>
          <div className="divide-y divide-[#E5E7EB]">
            {[
              { action: 'Nueva nota registrada', course: 'Matemáticas', time: 'Hace 5 minutos', icon: '📝' },
              { action: 'Asistencia tomada', course: 'Comunicación', time: 'Hace 15 minutos', icon: '✅' },
              { action: 'Estudiante agregado', course: 'Ciencias', time: 'Hace 1 hora', icon: '👤' },
              { action: 'Reporte generado', course: 'Historia', time: 'Hace 2 horas', icon: '📊' }
            ].map((activity, index) => (
              <div key={index} className="px-6 py-4 flex items-center justify-between hover:bg-[#F5F7FA] transition-colors">
                <div className="flex items-center space-x-4">
                  <span className="text-2xl">{activity.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-[#1F2937]">{activity.action}</p>
                    <p className="text-xs text-[#6B7280]">{activity.course}</p>
                  </div>
                </div>
                <span className="text-xs text-[#6B7280]">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
};
