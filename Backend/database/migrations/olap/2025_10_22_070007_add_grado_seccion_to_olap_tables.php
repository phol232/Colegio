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
        // Agregar dimensión de grado
        Schema::connection('olap')->create('dim_grado', function (Blueprint $table) {
            $table->increments('grado_key');
            $table->bigInteger('grado_id')->unique();
            $table->string('nivel'); // primaria, secundaria
            $table->smallInteger('numero'); // 1, 2, 3, 4, 5, 6
            $table->string('nombre'); // "1ro Primaria", "2do Secundaria"
            $table->timestamp('fecha_carga')->useCurrent();
            
            // Índice
            $table->index('grado_id', 'idx_dim_grado_id');
            $table->index('nivel', 'idx_dim_grado_nivel');
        });
        
        // Agregar dimensión de sección
        Schema::connection('olap')->create('dim_seccion', function (Blueprint $table) {
            $table->increments('seccion_key');
            $table->bigInteger('seccion_id')->unique();
            $table->string('nombre', 10); // A, B, C, D
            $table->integer('grado_key');
            $table->string('grado_nombre'); // Para facilitar consultas
            $table->timestamp('fecha_carga')->useCurrent();
            
            // Índice
            $table->index('seccion_id', 'idx_dim_seccion_id');
            $table->index('grado_key', 'idx_dim_seccion_grado');
        });
        
        // Actualizar dim_curso para incluir grado y sección
        Schema::connection('olap')->table('dim_curso', function (Blueprint $table) {
            $table->string('grado_nombre')->nullable()->after('docente_nombre');
            $table->string('seccion_nombre')->nullable()->after('grado_nombre');
        });
        
        // Actualizar fact_rendimiento_estudiantil para incluir grado y sección
        Schema::connection('olap')->table('fact_rendimiento_estudiantil', function (Blueprint $table) {
            $table->unsignedInteger('grado_key')->nullable()->after('docente_key');
            $table->unsignedInteger('seccion_key')->nullable()->after('grado_key');
            $table->year('anio_academico')->default(date('Y'))->after('seccion_key');
            
            // Foreign keys
            $table->foreign('grado_key')->references('grado_key')->on('dim_grado');
            $table->foreign('seccion_key')->references('seccion_key')->on('dim_seccion');
            
            // Índices
            $table->index('grado_key', 'idx_fact_grado');
            $table->index('seccion_key', 'idx_fact_seccion');
            $table->index('anio_academico', 'idx_fact_anio');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection('olap')->table('fact_rendimiento_estudiantil', function (Blueprint $table) {
            $table->dropIndex('idx_fact_grado');
            $table->dropIndex('idx_fact_seccion');
            $table->dropIndex('idx_fact_anio');
            $table->dropForeign(['grado_key']);
            $table->dropForeign(['seccion_key']);
            $table->dropColumn(['grado_key', 'seccion_key', 'anio_academico']);
        });
        
        Schema::connection('olap')->table('dim_curso', function (Blueprint $table) {
            $table->dropColumn(['grado_nombre', 'seccion_nombre']);
        });
        
        Schema::connection('olap')->dropIfExists('dim_seccion');
        Schema::connection('olap')->dropIfExists('dim_grado');
    }
};
