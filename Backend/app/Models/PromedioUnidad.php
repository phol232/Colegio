<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PromedioUnidad extends Model
{
    use HasFactory;

    protected $table = 'promedios_unidad';

    protected $fillable = [
        'estudiante_id',
        'curso_id',
        'unidad',
        'promedio_numerico',
        'promedio_literal',
        'total_evaluaciones',
    ];

    protected $casts = [
        'unidad' => 'integer',
        'promedio_numerico' => 'decimal:2',
        'total_evaluaciones' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // Relaciones

    /**
     * Estudiante del promedio
     */
    public function estudiante(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'estudiante_id');
    }

    /**
     * Curso del promedio
     */
    public function curso(): BelongsTo
    {
        return $this->belongsTo(Curso::class, 'curso_id');
    }

    // Scopes

    /**
     * Scope para filtrar por estudiante
     */
    public function scopeEstudiante($query, $estudianteId)
    {
        return $query->where('estudiante_id', $estudianteId);
    }

    /**
     * Scope para filtrar por curso
     */
    public function scopeCurso($query, $cursoId)
    {
        return $query->where('curso_id', $cursoId);
    }

    /**
     * Scope para filtrar por unidad
     */
    public function scopeUnidad($query, $unidad)
    {
        return $query->where('unidad', $unidad);
    }

    /**
     * Scope para promedios aprobados (>= 11)
     */
    public function scopeAprobados($query)
    {
        return $query->where('promedio_numerico', '>=', 11);
    }

    /**
     * Scope para promedios desaprobados (< 11)
     */
    public function scopeDesaprobados($query)
    {
        return $query->where('promedio_numerico', '<', 11);
    }

    /**
     * Scope para ordenar por promedio descendente
     */
    public function scopeMejoresPromedios($query)
    {
        return $query->orderBy('promedio_numerico', 'desc');
    }

    // Métodos auxiliares

    /**
     * Verifica si el promedio es aprobatorio
     */
    public function estaAprobado(): bool
    {
        return $this->promedio_numerico >= 11;
    }

    /**
     * Verifica si el promedio es desaprobatorio
     */
    public function estaDesaprobado(): bool
    {
        return $this->promedio_numerico < 11;
    }

    /**
     * Obtiene la calificación cualitativa
     */
    public function calificacionCualitativa(): string
    {
        if ($this->promedio_numerico >= 18) {
            return 'Excelente';
        } elseif ($this->promedio_numerico >= 15) {
            return 'Bueno';
        } elseif ($this->promedio_numerico >= 11) {
            return 'Regular';
        } else {
            return 'Deficiente';
        }
    }

    /**
     * Obtiene el nombre de la unidad
     */
    public function nombreUnidad(): string
    {
        return match($this->unidad) {
            1 => 'Primera Unidad',
            2 => 'Segunda Unidad',
            3 => 'Tercera Unidad',
            4 => 'Cuarta Unidad',
            default => 'Unidad ' . $this->unidad,
        };
    }

    /**
     * Obtiene la descripción del promedio literal (para primaria)
     */
    public function descripcionLiteral(): string
    {
        return match($this->promedio_literal) {
            'AD' => 'Logro destacado',
            'A' => 'Logro esperado',
            'B' => 'En proceso',
            'C' => 'En inicio',
            default => '-',
        };
    }

    /**
     * Verifica si tiene todas las evaluaciones registradas
     */
    public function tieneTodasLasEvaluaciones(): bool
    {
        $totalEvaluaciones = Evaluacion::where('curso_id', $this->curso_id)
            ->where('unidad', $this->unidad)
            ->count();
        
        return $this->total_evaluaciones >= $totalEvaluaciones;
    }

    /**
     * Obtiene el porcentaje de evaluaciones completadas
     */
    public function porcentajeCompletado(): float
    {
        $totalEvaluaciones = Evaluacion::where('curso_id', $this->curso_id)
            ->where('unidad', $this->unidad)
            ->count();
        
        if ($totalEvaluaciones == 0) {
            return 0;
        }
        
        return ($this->total_evaluaciones / $totalEvaluaciones) * 100;
    }
}
