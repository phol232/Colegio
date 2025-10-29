<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Evaluacion extends Model
{
    use HasFactory;

    protected $table = 'evaluaciones';

    protected $fillable = [
        'curso_id',
        'unidad',
        'mes',
        'nombre',
        'tipo_evaluacion',
        'peso',
        'orden',
    ];

    protected $casts = [
        'unidad' => 'integer',
        'mes' => 'integer',
        'peso' => 'decimal:2',
        'orden' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // Relaciones

    /**
     * Curso al que pertenece la evaluación
     */
    public function curso(): BelongsTo
    {
        return $this->belongsTo(Curso::class, 'curso_id');
    }

    /**
     * Notas de esta evaluación
     */
    public function notasDetalle(): HasMany
    {
        return $this->hasMany(NotaDetalle::class, 'evaluacion_id');
    }

    // Scopes

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
     * Scope para filtrar por mes
     */
    public function scopeMes($query, $mes)
    {
        return $query->where('mes', $mes);
    }

    /**
     * Scope para filtrar por tipo de evaluación
     */
    public function scopeTipo($query, $tipo)
    {
        return $query->where('tipo_evaluacion', $tipo);
    }

    /**
     * Scope para evaluaciones con peso
     */
    public function scopeConPeso($query)
    {
        return $query->whereNotNull('peso');
    }

    /**
     * Scope para evaluaciones sin peso
     */
    public function scopeSinPeso($query)
    {
        return $query->whereNull('peso');
    }

    /**
     * Scope para ordenar por orden
     */
    public function scopeOrdenado($query)
    {
        return $query->orderBy('orden');
    }

    // Métodos auxiliares

    /**
     * Verifica si la evaluación tiene peso asignado
     */
    public function tienePeso(): bool
    {
        return $this->peso !== null;
    }

    /**
     * Obtiene el total de notas registradas
     */
    public function totalNotas(): int
    {
        return $this->notasDetalle()->count();
    }

    /**
     * Verifica si tiene notas registradas
     */
    public function tieneNotas(): bool
    {
        return $this->totalNotas() > 0;
    }

    /**
     * Obtiene el promedio de todas las notas de esta evaluación
     */
    public function promedioGeneral(): float
    {
        return $this->notasDetalle()->avg('puntaje') ?? 0;
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
     * Obtiene el nombre del mes
     */
    public function nombreMes(): string
    {
        return match($this->mes) {
            3 => 'Marzo',
            4 => 'Abril',
            5 => 'Mayo',
            6 => 'Junio',
            7 => 'Julio',
            8 => 'Agosto',
            9 => 'Septiembre',
            10 => 'Octubre',
            11 => 'Noviembre',
            12 => 'Diciembre',
            default => 'Mes ' . $this->mes,
        };
    }
}
