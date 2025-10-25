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
        Schema::create('estudiantes_cursos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('estudiante_id')->constrained('usuarios')->onDelete('cascade');
            $table->foreignId('curso_id')->constrained('cursos')->onDelete('cascade');
            $table->date('fecha_matricula');
            $table->timestamp('created_at')->useCurrent();
            
            // Constraint único
            $table->unique(['estudiante_id', 'curso_id']);
            
            // Índices
            $table->index('estudiante_id', 'idx_est_cursos_estudiante');
            $table->index('curso_id', 'idx_est_cursos_curso');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('estudiantes_cursos');
    }
};
