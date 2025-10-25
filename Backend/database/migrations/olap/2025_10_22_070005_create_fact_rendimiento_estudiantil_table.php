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
        Schema::connection('olap')->create('fact_rendimiento_estudiantil', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('estudiante_key');
            $table->unsignedInteger('curso_key');
            $table->unsignedInteger('tiempo_key');
            $table->unsignedInteger('docente_key');
            
            // Métricas de asistencia
            $table->integer('total_asistencias')->default(0);
            $table->integer('total_faltas')->default(0);
            $table->integer('total_tardanzas')->default(0);
            $table->decimal('porcentaje_asistencia', 5, 2)->default(0);
            $table->integer('total_clases')->default(0);
            
            // Métricas de notas
            $table->decimal('promedio_notas', 4, 2)->nullable();
            $table->decimal('nota_unidad_1', 4, 2)->nullable();
            $table->decimal('nota_unidad_2', 4, 2)->nullable();
            $table->decimal('nota_unidad_3', 4, 2)->nullable();
            $table->decimal('nota_unidad_4', 4, 2)->nullable();
            
            // Metadata
            $table->timestamp('fecha_actualizacion')->useCurrent();
            
            // Foreign keys
            $table->foreign('estudiante_key')->references('estudiante_key')->on('dim_estudiante');
            $table->foreign('curso_key')->references('curso_key')->on('dim_curso');
            $table->foreign('tiempo_key')->references('tiempo_key')->on('dim_tiempo');
            $table->foreign('docente_key')->references('docente_key')->on('dim_docente');
            
            // Constraint único
            $table->unique(['estudiante_key', 'curso_key', 'tiempo_key']);
            
            // Índices para optimizar consultas analíticas
            $table->index('estudiante_key', 'idx_fact_estudiante');
            $table->index('curso_key', 'idx_fact_curso');
            $table->index('tiempo_key', 'idx_fact_tiempo');
            $table->index(['curso_key', 'tiempo_key'], 'idx_fact_compuesto');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection('olap')->dropIfExists('fact_rendimiento_estudiantil');
    }
};
