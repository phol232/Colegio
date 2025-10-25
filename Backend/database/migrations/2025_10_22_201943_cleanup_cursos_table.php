<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Eliminar columnas nombre y codigo que ya no se usan
        Schema::table('cursos', function (Blueprint $table) {
            $table->dropColumn(['nombre', 'codigo']);
        });

        // Reordenar columnas: curso_catalogo_id debe estar primero después de id
        // y created_at, updated_at al final
        DB::statement('
            ALTER TABLE cursos 
            ALTER COLUMN curso_catalogo_id SET NOT NULL
        ');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('cursos', function (Blueprint $table) {
            $table->string('nombre', 255)->nullable();
            $table->string('codigo', 50)->nullable();
        });
    }
};
