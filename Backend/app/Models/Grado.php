<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Grado extends Model
{
    protected $fillable = [
        'nivel',
        'numero',
        'nombre'
    ];

    protected $casts = [
        'numero' => 'integer'
    ];

    /**
     * Relación con secciones
     */
    public function secciones(): HasMany
    {
        return $this->hasMany(Seccion::class);
    }

    /**
     * Relación con cursos
     */
    public function cursos(): HasMany
    {
        return $this->hasMany(Curso::class);
    }
}
