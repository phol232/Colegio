<?php

use Illuminate\Support\Facades\Broadcast;

/*
|--------------------------------------------------------------------------
| Broadcast Channels
|--------------------------------------------------------------------------
|
| Here you may register all of the event broadcasting channels that your
| application supports. The given channel authorization callbacks are
| used to check if an authenticated user can listen to the channel.
|
*/

// Canal privado para estudiantes
Broadcast::channel('estudiante.{id}', function ($user, $id) {
    // El usuario solo puede escuchar su propio canal
    return (int) $user->id === (int) $id;
});

// Canal privado para cursos
Broadcast::channel('curso.{id}', function ($user, $id) {
    // Verificar que el usuario esté matriculado en el curso o sea el docente
    return \DB::table('estudiantes_cursos')
        ->where('estudiante_id', $user->id)
        ->where('curso_id', $id)
        ->exists()
        ||
        \DB::table('cursos')
        ->where('id', $id)
        ->where('docente_id', $user->id)
        ->exists();
});
