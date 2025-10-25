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
        Schema::connection('olap')->create('control_etl', function (Blueprint $table) {
            $table->increments('id');
            $table->string('proceso', 100);
            $table->timestamp('ultima_ejecucion')->nullable();
            $table->string('estado', 50)->nullable();
            $table->integer('registros_procesados')->nullable();
            $table->text('errores')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection('olap')->dropIfExists('control_etl');
    }
};
