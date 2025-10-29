<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Eliminar funciones viejas que usan columnas que ya no existen
        DB::statement('DROP FUNCTION IF EXISTS obtener_asistencias_estudiante(BIGINT, BIGINT, DATE, DATE)');
        DB::statement('DROP FUNCTION IF EXISTS obtener_notas_estudiante(BIGINT, BIGINT, INTEGER)');
    }

    public function down(): void
    {
        // No recrear las funciones viejas
    }
};
