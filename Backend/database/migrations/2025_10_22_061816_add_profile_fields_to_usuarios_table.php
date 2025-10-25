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
        Schema::table('usuarios', function (Blueprint $table) {
            // Agregar campos de perfil
            $table->string('dni', 20)->nullable()->unique()->after('email');
            $table->string('telefono', 20)->nullable()->after('dni');
            $table->text('direccion')->nullable()->after('telefono');
            $table->string('password')->after('google_id');
            
            // Hacer google_id nullable ya que ahora usaremos login manual
            $table->string('google_id')->nullable()->change();
            
            // Índice para DNI
            $table->index('dni', 'idx_usuarios_dni');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('usuarios', function (Blueprint $table) {
            $table->dropIndex('idx_usuarios_dni');
            $table->dropColumn(['dni', 'telefono', 'direccion', 'password']);
            
            // Revertir google_id a NOT NULL
            $table->string('google_id')->nullable(false)->change();
        });
    }
};
