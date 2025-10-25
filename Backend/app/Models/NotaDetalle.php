<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NotaDetalle extends Model
{
    use HasFactory;

    protected $table = 'notas_detalle';

    protected $fillable = [
        'evaluacion_id',
        'estudiante_id',
        'puntaje',
    ];

    protected $casts = [
        'puntaje' => 'decimal:2',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // Relaciones

    /**
     * Evaluación a la que pertenece la nota
     */
    public function evaluacion(): BelongsTo
    {
        return $this->belongsTo(Evaluacion::class, 'evaluacion_id');
    }

    /**
     * Estudiante de la nota
     */
    public function estudiante(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'estudiante_id');
    }

    // Scopes

    /**
     * Scope para filtrar por evaluación
     */
    public function scopeEvaluacion($query, $evaluacionId)
    {
        return $query->where('evaluacion_id', $evaluacionId);
    }

    /**
     * Scope para filtrar por estudiante
     */
    public function scopeEstudiante($query, $estudianteId)
    {
        return $query->where('estudiante_id', $estudianteId);
    }

    /**
     * Scope para notas aprobadas (>= 11)
     */
    public function scopeAprobadas($query)
    {
        return $query->where('puntaje', '>=', 11);
    }

    /**
     * Scope para notas desaprobadas (< 11)
     */
    public function scopeDesaprobadas($query)
    {
        return $query->where('puntaje', '<', 11);
    }

    /**
     * Scope para filtrar por curso a través de evaluación
     */
    public function scopeCurso($query, $cursoId)
    {
        return $query->whereHas('evaluacion', function($q) use ($cursoId) {
            $q->where('curso_id', $cursoId);
        });
    }

    /**
     * Scope para filtrar por unidad a través de evaluación
     */
    public function scopeUnidad($query, $unidad)
    {
        return $query->whereHas('evaluacion', function($q) use ($unidad) {
            $q->where('unidad', $unidad);
        });
    }

    // Métodos auxiliares

    /**
     * Verifica si la nota es aprobatoria
     */
    public function estaAprobado(): bool
    {
        return $this->puntaje >= 11;
    }

    /**
     * Verifica si la nota es desaprobatoria
     */
    public function estaDesaprobado(): bool
    {
        return $this->puntaje < 11;
    }

    /**
     * Obtiene la calificación cualitativa
     */
    public function calificacionCualitativa(): string
    {
        if ($this->puntaje >= 18) {
            return 'Excelente';
        } elseif ($this->puntaje >= 15) {
            return 'Bueno';
        } elseif ($this->puntaje >= 11) {
            return 'Regular';
        } else {
            return 'Deficiente';
        }
    }

    /**
     * Obtiene la calificación literal para primaria
     */
    public function calificacionLiteral(): string
    {
        if ($this->puntaje >= 17) {
            return 'AD'; // Logro destacado
        } elseif ($this->puntaje >= 14) {
            return 'A';  // Logro esperado
        } elseif ($this->puntaje >= 11) {
            return 'B';  // En proceso
        } else {
            return 'C';  // En inicio
        }
    }

    /**
     * Obtiene el curso a través de la evaluación
     */
    public function getCurso()
    {
        return $this->evaluacion->curso;
    }

    /**
     * Obtiene la unidad a través de la evaluación
     */
    public function getUnidad(): int
    {
        return $this->evaluacion->unidad;
    }
}
