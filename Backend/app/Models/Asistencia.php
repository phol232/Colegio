<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Asistencia extends Model
{
    use HasFactory;

    protected $table = 'asistencias';

    protected $fillable = [
        'estudiante_id',
        'curso_id',
        'fecha',
        'estado',
    ];

    protected $casts = [
        'fecha' => 'date',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // Relaciones

    /**
     * Estudiante de la asistencia
     */
    public function estudiante(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'estudiante_id');
    }

    /**
     * Curso de la asistencia
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
     * Scope para filtrar por fecha
     */
    public function scopeFecha($query, $fecha)
    {
        return $query->whereDate('fecha', $fecha);
    }

    /**
     * Scope para filtrar por rango de fechas
     */
    public function scopeEntreFechas($query, $fechaInicio, $fechaFin)
    {
        return $query->whereBetween('fecha', [$fechaInicio, $fechaFin]);
    }

    /**
     * Scope para filtrar por estado
     */
    public function scopeEstado($query, $estado)
    {
        return $query->where('estado', $estado);
    }

    /**
     * Scope para presentes
     */
    public function scopePresentes($query)
    {
        return $query->where('estado', 'presente');
    }

    /**
     * Scope para ausentes
     */
    public function scopeAusentes($query)
    {
        return $query->where('estado', 'ausente');
    }

    /**
     * Scope para tardanzas
     */
    public function scopeTardanzas($query)
    {
        return $query->where('estado', 'tardanza');
    }

    // Métodos auxiliares

    /**
     * Verifica si el estudiante estuvo presente
     */
    public function estuvoPresente(): bool
    {
        return $this->estado === 'presente';
    }

    /**
     * Verifica si el estudiante estuvo ausente
     */
    public function estuvoAusente(): bool
    {
        return $this->estado === 'ausente';
    }

    /**
     * Verifica si el estudiante llegó tarde
     */
    public function llegoTarde(): bool
    {
        return $this->estado === 'tardanza';
    }
}
