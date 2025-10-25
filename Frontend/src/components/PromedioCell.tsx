import { useState } from 'react';

interface PromedioCellProps {
    promedio: number;
    literal?: string;
    esPrimaria: boolean;
    totalEvaluaciones?: number;
    evaluacionesTotales?: number;
    desglose?: Array<{ nombre: string; puntaje: number; peso?: number }>;
}

export const PromedioCell: React.FC<PromedioCellProps> = ({
    promedio,
    literal,
    esPrimaria,
    totalEvaluaciones,
    evaluacionesTotales,
    desglose
}) => {
    const [mostrarTooltip, setMostrarTooltip] = useState(false);

    const getEstadoColor = () => {
        if (promedio >= 14) {
            return {
                text: 'text-green-600',
                bg: 'bg-green-100',
                border: 'border-green-600'
            };
        }
        if (promedio >= 11) {
            return {
                text: 'text-yellow-600',
                bg: 'bg-yellow-100',
                border: 'border-yellow-600'
            };
        }
        return {
            text: 'text-red-600',
            bg: 'bg-red-100',
            border: 'border-red-600'
        };
    };

    const getDescripcionLiteral = (lit: string) => {
        switch (lit) {
            case 'AD': return 'Logro destacado';
            case 'A': return 'Logro esperado';
            case 'B': return 'En proceso';
            case 'C': return 'En inicio';
            default: return '';
        }
    };

    const estado = getEstadoColor();

    if (promedio === 0 && (!totalEvaluaciones || totalEvaluaciones === 0)) {
        return (
            <div className="text-center py-2">
                <span className="text-xs text-gray-400">Sin notas</span>
            </div>
        );
    }

    return (
        <div 
            className="relative"
            onMouseEnter={() => setMostrarTooltip(true)}
            onMouseLeave={() => setMostrarTooltip(false)}
        >
            <div className={`${estado.bg} rounded-lg p-2 text-center cursor-help`}>
                {/* Promedio numérico */}
                <div className={`text-lg font-bold ${estado.text}`}>
                    {promedio.toFixed(2)}
                </div>

                {/* Literal para primaria */}
                {esPrimaria && literal && (
                    <div className={`text-sm font-semibold ${estado.text} mt-0.5`}>
                        {literal}
                    </div>
                )}

                {/* Contador de evaluaciones */}
                {totalEvaluaciones !== undefined && evaluacionesTotales !== undefined && (
                    <div className="text-[10px] text-[#6B7280] mt-1">
                        {totalEvaluaciones}/{evaluacionesTotales} evaluaciones
                    </div>
                )}

                {/* Indicador de estado */}
                <div className={`text-[10px] ${estado.text} mt-0.5`}>
                    {promedio >= 14 ? '✓ Aprobado' : promedio >= 11 ? '⚠ Regular' : '✗ Desaprobado'}
                </div>
            </div>

            {/* Tooltip con desglose */}
            {mostrarTooltip && desglose && desglose.length > 0 && (
                <div className="absolute z-50 bottom-full right-0 mb-2 w-64 bg-white rounded-lg shadow-xl border border-[#E5E7EB] p-3">
                    <div className="text-xs font-semibold text-[#0E2B5C] mb-2">
                        Desglose de Notas
                    </div>
                    
                    <div className="space-y-1.5">
                        {desglose.map((item, index) => (
                            <div key={index} className="flex items-center justify-between text-xs">
                                <span className="text-[#6B7280] flex-1 truncate">
                                    {item.nombre}
                                    {item.peso && <span className="text-[10px]"> ({item.peso}%)</span>}
                                </span>
                                <span className={`font-semibold ml-2 ${
                                    item.puntaje >= 14 ? 'text-green-600' :
                                    item.puntaje >= 11 ? 'text-yellow-600' :
                                    'text-red-600'
                                }`}>
                                    {item.puntaje.toFixed(1)}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="mt-2 pt-2 border-t border-[#E5E7EB] flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#0E2B5C]">
                            Promedio:
                        </span>
                        <span className={`text-sm font-bold ${estado.text}`}>
                            {promedio.toFixed(2)}
                            {esPrimaria && literal && ` (${literal})`}
                        </span>
                    </div>

                    {esPrimaria && literal && (
                        <div className="mt-1 text-[10px] text-[#6B7280] text-center">
                            {getDescripcionLiteral(literal)}
                        </div>
                    )}

                    {/* Flecha del tooltip */}
                    <div className="absolute top-full right-4 w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-white"></div>
                </div>
            )}
        </div>
    );
};
