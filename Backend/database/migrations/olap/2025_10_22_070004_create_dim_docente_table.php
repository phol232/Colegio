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
        Schema::connection('olap')->create('dim_docente', function (Blueprint $table) {
            $table->increments('docente_key');
            $table->bigInteger('docente_id')->unique();
            $table->string('nombre');
            $table->string('email');
            $table->timestamp('fecha_carga')->useCurrent();
            
            // Índice
            $table->index('docente_id', 'idx_dim_docente_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection('olap')->dropIfExists('dim_docente');
    }
};
