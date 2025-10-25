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
        Schema::create('usuarios', function (Blueprint $table) {
            $table->id();
            $table->string('email')->unique();
            $table->string('name');
            $table->string('google_id')->unique();
            $table->enum('role', ['docente', 'estudiante', 'padre', 'admin']);
            $table->text('avatar')->nullable();
            $table->timestamps();
            
            // Índices
            $table->index('role', 'idx_usuarios_role');
            $table->index('google_id', 'idx_usuarios_google_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('usuarios');
    }
};
