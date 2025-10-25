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
        Schema::create('asistencias', function (Blueprint $table) {
            $table->id();
            $table->foreignId('estudiante_id')->constrained('usuarios')->onDelete('cascade');
            $table->foreignId('curso_id')->constrained('cursos')->onDelete('cascade');
            $table->date('fecha');
            $table->enum('estado', ['presente', 'ausente', 'tardanza']);
            $table->timestamps();
            
            // Constraint único: un estudiante solo puede tener un registro de asistencia por curso por día
            $table->unique(['estudiante_id', 'curso_id', 'fecha']);
            
            // Índices para optimizar consultas
            $table->index('estudiante_id', 'idx_asistencias_estudiante');
            $table->index('curso_id', 'idx_asistencias_curso');
            $table->index('fecha', 'idx_asistencias_fecha');
            $table->index(['curso_id', 'fecha'], 'idx_asistencias_compuesto');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('asistencias');
    }
};
