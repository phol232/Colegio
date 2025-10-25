<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Elimina la tabla 'notas' antigua ya que todos los datos
     * han sido migrados al nuevo sistema de evaluaciones múltiples
     */
    public function up(): void
    {
        // Verificar que los datos fueron migrados correctamente
        $notasAntiguas = DB::table('notas')->count();
        $notasNuevas = DB::table('notas_detalle')->count();
        
        if ($notasAntiguas > 0 && $notasNuevas == 0) {
            throw new \Exception('ERROR: Los datos no han sido migrados. No se puede eliminar la tabla notas.');
        }
        
        // Eliminar funciones antiguas de notas si existen
        DB::unprepared("
            DROP FUNCTION IF EXISTS registrar_nota;
            DROP FUNCTION IF EXISTS actualizar_nota;
            DROP FUNCTION IF EXISTS obtener_notas_estudiante;
            DROP FUNCTION IF EXISTS obtener_notas_curso;
            DROP FUNCTION IF EXISTS obtener_resumen_notas;
        ");
        
        // Eliminar la tabla notas antigua
        Schema::dropIfExists('notas');
        
        // Log de la migración
        DB::statement("
            DO $$
            BEGIN
                RAISE NOTICE 'Tabla notas eliminada exitosamente. Datos migrados: % notas', {$notasAntiguas};
            END $$;
        ");
    }

    /**
     * Reverse the migrations.
     * 
     * ADVERTENCIA: No se puede revertir esta migración automáticamente
     * ya que los datos han sido transformados al nuevo formato
     */
    public function down(): void
    {
        // No se puede revertir automáticamente
        throw new \Exception('No se puede revertir la eliminación de la tabla notas. Los datos están en el nuevo formato.');
    }
};
