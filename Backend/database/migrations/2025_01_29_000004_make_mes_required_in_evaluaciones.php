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
        Schema::table('evaluaciones', function (Blueprint $table) {
            // Hacer el campo mes obligatorio
            $table->integer('mes')->nullable(false)->change();
            
            // Hacer el campo unidad opcional (para compatibilidad temporal)
            $table->integer('unidad')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('evaluaciones', function (Blueprint $table) {
            // Revertir los cambios
            $table->integer('mes')->nullable()->change();
            $table->integer('unidad')->nullable(false)->change();
        });
    }
};