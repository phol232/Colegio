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
        Schema::connection('olap')->create('dim_tiempo', function (Blueprint $table) {
            $table->increments('tiempo_key');
            $table->date('fecha')->unique();
            $table->smallInteger('dia');
            $table->smallInteger('mes');
            $table->smallInteger('anio');
            $table->smallInteger('trimestre');
            $table->smallInteger('semestre');
            $table->smallInteger('dia_semana');
            $table->string('nombre_mes', 20)->nullable();
            $table->string('nombre_dia', 20)->nullable();
            
            // Índices
            $table->index('fecha', 'idx_dim_tiempo_fecha');
            $table->index(['anio', 'mes'], 'idx_dim_tiempo_anio_mes');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection('olap')->dropIfExists('dim_tiempo');
    }
};
