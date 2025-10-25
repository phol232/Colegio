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
        // Tabla de evaluaciones
        Schema::create('evaluaciones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('curso_id')->constrained('cursos')->onDelete('cascade');
            $table->smallInteger('unidad')->unsigned();
            $table->string('nombre', 100);
            $table->string('tipo_evaluacion', 50);
            $table->decimal('peso', 5, 2)->nullable();
            $table->smallInteger('orden')->default(1);
            $table->timestamps();
            
            // Constraint único: nombre de evaluación único por curso y unidad
            $table->unique(['curso_id', 'unidad', 'nombre'], 'uk_evaluacion_curso_unidad_nombre');
            
            // Índices para optimizar consultas
            $table->index(['curso_id', 'unidad'], 'idx_evaluaciones_curso_unidad');
            $table->index('tipo_evaluacion', 'idx_evaluaciones_tipo');
            
            // Check constraints se validarán en el modelo y funciones
        });
        
        // Tabla de notas detalle
        Schema::create('notas_detalle', function (Blueprint $table) {
            $table->id();
            $table->foreignId('evaluacion_id')->constrained('evaluaciones')->onDelete('cascade');
            $table->foreignId('estudiante_id')->constrained('usuarios')->onDelete('cascade');
            $table->decimal('puntaje', 4, 2);
            $table->timestamps();
            
            // Constraint único: un estudiante solo puede tener una nota por evaluación
            $table->unique(['evaluacion_id', 'estudiante_id'], 'uk_nota_evaluacion_estudiante');
            
            // Índices para optimizar consultas
            $table->index('estudiante_id', 'idx_notas_detalle_estudiante');
            $table->index('evaluacion_id', 'idx_notas_detalle_evaluacion');
        });
        
        // Tabla de promedios por unidad
        Schema::create('promedios_unidad', function (Blueprint $table) {
            $table->id();
            $table->foreignId('estudiante_id')->constrained('usuarios')->onDelete('cascade');
            $table->foreignId('curso_id')->constrained('cursos')->onDelete('cascade');
            $table->smallInteger('unidad')->unsigned();
            $table->decimal('promedio_numerico', 4, 2);
            $table->string('promedio_literal', 2)->nullable();
            $table->smallInteger('total_evaluaciones')->default(0);
            $table->timestamps();
            
            // Constraint único: un promedio por estudiante, curso y unidad
            $table->unique(['estudiante_id', 'curso_id', 'unidad'], 'uk_promedio_estudiante_curso_unidad');
            
            // Índices para optimizar consultas
            $table->index(['curso_id', 'unidad'], 'idx_promedios_curso_unidad');
            $table->index('estudiante_id', 'idx_promedios_estudiante');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('promedios_unidad');
        Schema::dropIfExists('notas_detalle');
        Schema::dropIfExists('evaluaciones');
    }
};
