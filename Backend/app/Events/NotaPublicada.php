<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class NotaPublicada implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public int $estudianteId;
    public int $cursoId;
    public int $unidad;
    public float $puntaje;
    public array $resumen;

    /**
     * Create a new event instance.
     */
    public function __construct(int $estudianteId, int $cursoId, int $unidad, float $puntaje, array $resumen = [])
    {
        $this->estudianteId = $estudianteId;
        $this->cursoId = $cursoId;
        $this->unidad = $unidad;
        $this->puntaje = $puntaje;
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
            'tipo' => 'nota_publicada',
            'curso_id' => $this->cursoId,
            'unidad' => $this->unidad,
            'puntaje' => $this->puntaje,
            'resumen' => $this->resumen,
            'timestamp' => now()->toIso8601String()
        ];
    }
}
