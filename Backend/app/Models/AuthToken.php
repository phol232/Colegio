<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuthToken extends Model
{
    use HasFactory;

    protected $table = 'auth_tokens';

    public $timestamps = false;

    protected $fillable = [
        'usuario_id',
        'token',
        'expires_at',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'created_at' => 'datetime',
    ];

    // Relaciones

    /**
     * Usuario propietario del token
     */
    public function usuario(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'usuario_id');
    }

    // Scopes

    /**
     * Scope para tokens válidos (no expirados)
     */
    public function scopeValidos($query)
    {
        return $query->where('expires_at', '>', now());
    }

    /**
     * Scope para tokens expirados
     */
    public function scopeExpirados($query)
    {
        return $query->where('expires_at', '<=', now());
    }

    /**
     * Scope para filtrar por usuario
     */
    public function scopeUsuario($query, $usuarioId)
    {
        return $query->where('usuario_id', $usuarioId);
    }

    // Métodos auxiliares

    /**
     * Verifica si el token es válido (no expirado)
     */
    public function esValido(): bool
    {
        return $this->expires_at->isFuture();
    }

    /**
     * Verifica si el token está expirado
     */
    public function estaExpirado(): bool
    {
        return $this->expires_at->isPast();
    }

    /**
     * Obtiene el tiempo restante hasta la expiración
     */
    public function tiempoRestante(): string
    {
        if ($this->estaExpirado()) {
            return 'Expirado';
        }

        return $this->expires_at->diffForHumans();
    }

    /**
     * Revoca el token (lo elimina)
     */
    public function revocar(): bool
    {
        return $this->delete();
    }
}
