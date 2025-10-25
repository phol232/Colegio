<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Seccion extends Model
{
    protected $table = 'secciones';

    protected $fillable = [
        'grado_id',
        'nombre',
        'capacidad'
    ];

    protected $casts = [
        'grado_id' => 'integer',
        'capacidad' => 'integer'
    ];

    /**
     * Relación con grado
     */
    public function grado(): BelongsTo
    {
        return $this->belongsTo(Grado::class);
    }

    /**
     * Relación con cursos
     */
    public function cursos(): HasMany
    {
        return $this->hasMany(Curso::class);
    }
}
