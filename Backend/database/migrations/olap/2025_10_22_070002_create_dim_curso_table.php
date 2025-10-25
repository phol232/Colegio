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
        Schema::connection('olap')->create('dim_curso', function (Blueprint $table) {
            $table->increments('curso_key');
            $table->bigInteger('curso_id')->unique();
            $table->string('nombre');
            $table->string('codigo', 50);
            $table->string('docente_nombre')->nullable();
            $table->timestamp('fecha_carga')->useCurrent();
            
            // Índice
            $table->index('curso_id', 'idx_dim_curso_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection('olap')->dropIfExists('dim_curso');
    }
};
