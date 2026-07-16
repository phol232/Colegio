import { Link } from 'react-router-dom';

export const Mantenimiento = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-6 flex justify-center">
          <img
            src="/imagenes/WhatsApp Image 2025-10-22 at 10.42.20 (1).jpeg"
            alt="Logo Colegio"
            className="w-20 h-20 object-contain"
          />
        </div>
        <h1 className="text-2xl font-bold text-[#0E2B5C] mb-3">
          Sistema en mantenimiento
        </h1>
        <p className="text-gray-600 mb-8">
          El sistema se encuentra temporalmente en mantenimiento. Solo los
          administradores pueden acceder en este momento. Por favor, intenta más
          tarde.
        </p>
        <Link
          to="/login"
          className="inline-flex items-center justify-center rounded-lg bg-[#0E2B5C] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#163B73] transition-colors"
        >
          Volver al inicio de sesión
        </Link>
      </div>
    </div>
  );
};
