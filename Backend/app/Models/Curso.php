<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Curso extends Model
{
    use HasFactory;

    protected $table = 'cursos';

    protected $fillable = [
        'nombre',
        'codigo',
        'docente_id',
        'grado_id',
        'seccion_id',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // Relaciones

    /**
     * Docente que imparte el curso
     */
    public function docente(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'docente_id');
    }

    /**
     * Grado al que pertenece el curso
     */
    public function grado(): BelongsTo
    {
        return $this->belongsTo(Grado::class, 'grado_id');
    }

    /**
     * Sección a la que pertenece el curso
     */
    public function seccion(): BelongsTo
    {
        return $this->belongsTo(Seccion::class, 'seccion_id');
    }

    /**
     * Estudiantes matriculados en el curso
     */
    public function estudiantes(): BelongsToMany
    {
        return $this->belongsToMany(Usuario::class, 'estudiantes_cursos', 'curso_id', 'estudiante_id')
            ->withPivot('fecha_matricula', 'anio_academico')
            ->withTimestamps();
    }

    /**
     * Asistencias del curso
     */
    public function asistencias(): HasMany
    {
        return $this->hasMany(Asistencia::class, 'curso_id');
    }

    /**
     * Notas del curso
     */
    public function notas(): HasMany
    {
        return $this->hasMany(Nota::class, 'curso_id');
    }

    // Scopes

    /**
     * Scope para filtrar por docente
     */
    public function scopeDocente($query, $docenteId)
    {
        return $query->where('docente_id', $docenteId);
    }

    /**
     * Scope para filtrar por grado
     */
    public function scopeGrado($query, $gradoId)
    {
        return $query->where('grado_id', $gradoId);
    }

    /**
     * Scope para filtrar por sección
     */
    public function scopeSeccion($query, $seccionId)
    {
        return $query->where('seccion_id', $seccionId);
    }

    // Métodos auxiliares

    /**
     * Obtiene el nombre completo del curso con grado y sección
     */
    public function nombreCompleto(): string
    {
        $nombre = $this->nombre;
        
        if ($this->grado) {
            $nombre .= ' - ' . $this->grado->nombre;
        }
        
        if ($this->seccion) {
            $nombre .= ' Sección ' . $this->seccion->nombre;
        }
        
        return $nombre;
    }

    /**
     * Obtiene el total de estudiantes matriculados
     */
    public function totalEstudiantes(): int
    {
        return $this->estudiantes()->count();
    }

    /**
     * Obtiene el promedio de notas del curso
     */
    public function promedioNotas(): float
    {
        return $this->notas()->avg('puntaje') ?? 0;
    }

    /**
     * Obtiene el porcentaje de asistencia del curso
     */
    public function porcentajeAsistencia(): float
    {
        $totalAsistencias = $this->asistencias()->count();
        
        if ($totalAsistencias === 0) {
            return 0;
        }
        
        $presentes = $this->asistencias()->where('estado', 'presente')->count();
        
        return ($presentes / $totalAsistencias) * 100;
    }
}
