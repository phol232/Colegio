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
        Schema::connection('olap')->create('dim_estudiante', function (Blueprint $table) {
            $table->increments('estudiante_key');
            $table->bigInteger('estudiante_id')->unique();
            $table->string('nombre');
            $table->string('email');
            $table->timestamp('fecha_carga')->useCurrent();
            
            // Índice
            $table->index('estudiante_id', 'idx_dim_est_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection('olap')->dropIfExists('dim_estudiante');
    }
};
