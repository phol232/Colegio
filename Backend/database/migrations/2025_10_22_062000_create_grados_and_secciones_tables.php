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
        // Tabla de grados (1ro Primaria, 2do Primaria, etc.)
        Schema::create('grados', function (Blueprint $table) {
            $table->id();
            $table->enum('nivel', ['primaria', 'secundaria']);
            $table->smallInteger('numero'); // 1, 2, 3, 4, 5, 6
            $table->string('nombre'); // "1ro Primaria", "2do Secundaria", etc.
            $table->timestamps();
            
            // Constraint único: no puede haber dos grados con el mismo nivel y número
            $table->unique(['nivel', 'numero']);
            
            // Índice
            $table->index('nivel', 'idx_grados_nivel');
        });
        
        // Tabla de secciones (A, B, C, D por cada grado)
        Schema::create('secciones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('grado_id')->constrained('grados')->onDelete('cascade');
            $table->string('nombre', 10); // A, B, C, D
            $table->integer('capacidad')->default(30); // Capacidad máxima de estudiantes
            $table->timestamps();
            
            // Constraint único: no puede haber dos secciones con el mismo nombre en el mismo grado
            $table->unique(['grado_id', 'nombre']);
            
            // Índice
            $table->index('grado_id', 'idx_secciones_grado');
        });
        
        // Actualizar tabla cursos para vincularla con grado y sección
        Schema::table('cursos', function (Blueprint $table) {
            $table->foreignId('grado_id')->nullable()->after('docente_id')->constrained('grados')->onDelete('cascade');
            $table->foreignId('seccion_id')->nullable()->after('grado_id')->constrained('secciones')->onDelete('cascade');
            
            // Índices
            $table->index('grado_id', 'idx_cursos_grado');
            $table->index('seccion_id', 'idx_cursos_seccion');
        });
        
        // Actualizar tabla estudiantes_cursos para agregar el año académico
        Schema::table('estudiantes_cursos', function (Blueprint $table) {
            $table->year('anio_academico')->default(date('Y'))->after('fecha_matricula');
            
            // Índice
            $table->index('anio_academico', 'idx_est_cursos_anio');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revertir cambios en orden inverso
        Schema::table('estudiantes_cursos', function (Blueprint $table) {
            $table->dropIndex('idx_est_cursos_anio');
            $table->dropColumn('anio_academico');
        });
        
        Schema::table('cursos', function (Blueprint $table) {
            $table->dropIndex('idx_cursos_grado');
            $table->dropIndex('idx_cursos_seccion');
            $table->dropForeign(['grado_id']);
            $table->dropForeign(['seccion_id']);
            $table->dropColumn(['grado_id', 'seccion_id']);
        });
        
        Schema::dropIfExists('secciones');
        Schema::dropIfExists('grados');
    }
};
