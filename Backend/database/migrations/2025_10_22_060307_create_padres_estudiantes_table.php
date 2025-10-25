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
        Schema::create('padres_estudiantes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('padre_id')->constrained('usuarios')->onDelete('cascade');
            $table->foreignId('estudiante_id')->constrained('usuarios')->onDelete('cascade');
            $table->timestamp('created_at')->useCurrent();
            
            // Constraint único: un padre no puede estar vinculado dos veces al mismo estudiante
            $table->unique(['padre_id', 'estudiante_id']);
            
            // Índice para optimizar consultas
            $table->index('padre_id', 'idx_padres_est_padre');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('padres_estudiantes');
    }
};
