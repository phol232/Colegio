<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class AsistenciaActualizada implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public int $estudianteId;
    public int $cursoId;
    public string $fecha;
    public string $estado;
    public array $resumen;

    /**
     * Create a new event instance.
     */
    public function __construct(int $estudianteId, int $cursoId, string $fecha, string $estado, array $resumen = [])
    {
        $this->estudianteId = $estudianteId;
        $this->cursoId = $cursoId;
        $this->fecha = $fecha;
        $this->estado = $estado;
        $this->resumen = $resumen;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('estudiante.' . $this->estudianteId),
        ];
    }

    /**
     * Get the data to broadcast.
     *
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'tipo' => 'asistencia_actualizada',
            'curso_id' => $this->cursoId,
            'fecha' => $this->fecha,
            'estado' => $this->estado,
            'resumen' => $this->resumen,
            'timestamp' => now()->toIso8601String()
        ];
    }
}
