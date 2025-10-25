<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Usuario extends Model
{
    use HasFactory;

    protected $table = 'usuarios';

    protected $fillable = [
        'email',
        'dni',
        'telefono',
        'direccion',
        'name',
        'google_id',
        'password',
        'role',
        'avatar',
    ];

    protected $hidden = [
        'password',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // Relaciones

    /**
     * Cursos que el usuario (docente) imparte
     */
    public function cursosImpartidos(): HasMany
    {
        return $this->hasMany(Curso::class, 'docente_id');
    }

    /**
     * Cursos en los que el usuario (estudiante) está matriculado
     */
    public function cursosMatriculados(): BelongsToMany
    {
        return $this->belongsToMany(Curso::class, 'estudiantes_cursos', 'estudiante_id', 'curso_id')
            ->withPivot('fecha_matricula', 'anio_academico')
            ->withTimestamps();
    }

    /**
     * Asistencias del usuario (estudiante)
     */
    public function asistencias(): HasMany
    {
        return $this->hasMany(Asistencia::class, 'estudiante_id');
    }

    /**
     * Notas del usuario (estudiante)
     */
    public function notas(): HasMany
    {
        return $this->hasMany(Nota::class, 'estudiante_id');
    }

    /**
     * Hijos del usuario (padre)
     */
    public function hijos(): BelongsToMany
    {
        return $this->belongsToMany(Usuario::class, 'padres_estudiantes', 'padre_id', 'estudiante_id')
            ->withTimestamps();
    }

    /**
     * Padres del usuario (estudiante)
     */
    public function padres(): BelongsToMany
    {
        return $this->belongsToMany(Usuario::class, 'padres_estudiantes', 'estudiante_id', 'padre_id')
            ->withTimestamps();
    }

    /**
     * Tokens de autenticación del usuario
     */
    public function tokens(): HasMany
    {
        return $this->hasMany(AuthToken::class, 'usuario_id');
    }

    // Scopes

    /**
     * Scope para filtrar por rol
     */
    public function scopeRole($query, $role)
    {
        return $query->where('role', $role);
    }

    /**
     * Scope para docentes
     */
    public function scopeDocentes($query)
    {
        return $query->where('role', 'docente');
    }

    /**
     * Scope para estudiantes
     */
    public function scopeEstudiantes($query)
    {
        return $query->where('role', 'estudiante');
    }

    /**
     * Scope para padres
     */
    public function scopePadres($query)
    {
        return $query->where('role', 'padre');
    }

    // Métodos auxiliares

    /**
     * Verifica si el usuario es docente
     */
    public function esDocente(): bool
    {
        return $this->role === 'docente';
    }

    /**
     * Verifica si el usuario es estudiante
     */
    public function esEstudiante(): bool
    {
        return $this->role === 'estudiante';
    }

    /**
     * Verifica si el usuario es padre
     */
    public function esPadre(): bool
    {
        return $this->role === 'padre';
    }

    /**
     * Verifica si el usuario es admin
     */
    public function esAdmin(): bool
    {
        return $this->role === 'admin';
    }
}
