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
        Schema::create('notas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('estudiante_id')->constrained('usuarios')->onDelete('cascade');
            $table->foreignId('curso_id')->constrained('cursos')->onDelete('cascade');
            $table->smallInteger('unidad')->unsigned();
            $table->decimal('puntaje', 4, 2);
            $table->timestamps();
            
            // Constraint único: un estudiante solo puede tener una nota por curso por unidad
            $table->unique(['estudiante_id', 'curso_id', 'unidad']);
            
            // Índices para optimizar consultas
            $table->index('estudiante_id', 'idx_notas_estudiante');
            $table->index('curso_id', 'idx_notas_curso');
            $table->index(['curso_id', 'unidad'], 'idx_notas_compuesto');
            
            // Note: Check constraints (unidad 1-4, puntaje 0-20) se validarán en el modelo
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notas');
    }
};
