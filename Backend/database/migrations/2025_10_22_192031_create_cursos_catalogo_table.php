<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Crear tabla de catálogo de cursos
        Schema::create('cursos_catalogo', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 100)->unique();
            $table->string('codigo', 20)->unique();
            $table->enum('nivel', ['primaria', 'secundaria', 'ambos'])->default('ambos');
            $table->text('descripcion')->nullable();
            $table->timestamps();
        });

        // Insertar cursos del catálogo
        $cursos = [
            // Cursos para ambos niveles
            ['nombre' => 'Matemática', 'codigo' => 'MAT', 'nivel' => 'ambos'],
            ['nombre' => 'Geometría', 'codigo' => 'GEO', 'nivel' => 'ambos'],
            ['nombre' => 'Aritmética', 'codigo' => 'ARI', 'nivel' => 'ambos'],
            ['nombre' => 'Álgebra', 'codigo' => 'ALG', 'nivel' => 'ambos'],
            ['nombre' => 'Historia Universal', 'codigo' => 'HIS-UNI', 'nivel' => 'ambos'],
            ['nombre' => 'Historia del Perú', 'codigo' => 'HIS-PER', 'nivel' => 'ambos'],
            ['nombre' => 'Ética y Ciudadanía', 'codigo' => 'ETI', 'nivel' => 'ambos'],
            ['nombre' => 'Biología', 'codigo' => 'BIO', 'nivel' => 'ambos'],
            ['nombre' => 'Química', 'codigo' => 'QUI', 'nivel' => 'ambos'],
            ['nombre' => 'Educación Física', 'codigo' => 'ED-FIS', 'nivel' => 'ambos'],
            ['nombre' => 'Talleres', 'codigo' => 'TAL', 'nivel' => 'ambos'],
            ['nombre' => 'Computación', 'codigo' => 'COM', 'nivel' => 'ambos'],
            ['nombre' => 'Inglés', 'codigo' => 'ING', 'nivel' => 'ambos'],
            
            // Solo primaria
            ['nombre' => 'Arte', 'codigo' => 'ART', 'nivel' => 'primaria'],
            
            // Solo secundaria
            ['nombre' => 'Estadística', 'codigo' => 'EST', 'nivel' => 'secundaria'],
            ['nombre' => 'Trigonometría', 'codigo' => 'TRI', 'nivel' => 'secundaria'],
            ['nombre' => 'Economía', 'codigo' => 'ECO', 'nivel' => 'secundaria'],
        ];

        foreach ($cursos as $curso) {
            DB::table('cursos_catalogo')->insert([
                'nombre' => $curso['nombre'],
                'codigo' => $curso['codigo'],
                'nivel' => $curso['nivel'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // Modificar tabla cursos para referenciar al catálogo
        Schema::table('cursos', function (Blueprint $table) {
            $table->foreignId('curso_catalogo_id')->nullable()->after('id')->constrained('cursos_catalogo')->onDelete('cascade');
            $table->string('codigo', 50)->nullable()->change();
            $table->string('nombre', 255)->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('cursos', function (Blueprint $table) {
            $table->dropForeign(['curso_catalogo_id']);
            $table->dropColumn('curso_catalogo_id');
        });
        
        Schema::dropIfExists('cursos_catalogo');
    }
};
