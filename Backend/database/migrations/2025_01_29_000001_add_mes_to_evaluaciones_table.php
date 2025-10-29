<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('evaluaciones', function (Blueprint $table) {
            $table->integer('mes')->nullable()->after('unidad')->comment('Mes del año (3-12 para marzo-diciembre)');
            
            // Agregar índice para mejorar consultas
            $table->index(['curso_id', 'mes'], 'idx_evaluaciones_curso_mes');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('evaluaciones', function (Blueprint $table) {
            $table->dropIndex('idx_evaluaciones_curso_mes');
            $table->dropColumn('mes');
        });
    }
};