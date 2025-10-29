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
        // Asignar un mes por defecto a las evaluaciones existentes que no tienen mes
        // Mapear unidades a meses: 1->3 (Marzo), 2->6 (Junio), 3->9 (Septiembre), 4->12 (Diciembre)
        DB::statement("
            UPDATE evaluaciones 
            SET mes = CASE 
                WHEN unidad = 1 THEN 3
                WHEN unidad = 2 THEN 6
                WHEN unidad = 3 THEN 9
                WHEN unidad = 4 THEN 12
                ELSE 3
            END
            WHERE mes IS NULL
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No hay necesidad de revertir, ya que solo estamos poblando datos
    }
};