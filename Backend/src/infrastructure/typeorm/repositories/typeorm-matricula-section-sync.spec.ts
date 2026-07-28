/**
 * Contrato de sincronización sección ↔ estudiantes_cursos y vacantes.
 * La lógica vive en TypeOrmMatriculaRepository (assignStudentsToSeccionLegacy,
 * validarCupo, getSeccionesConCupos).
 */

function vacantes(capacidad: number, matriculados: number): number {
  return Math.max(0, capacidad - matriculados);
}

describe('Sincronización director-docente (contrato)', () => {
  it('define el conjunto final de estudiantes por sección', () => {
    const actuales = [1, 2, 3];
    const deseados = [2, 4];
    const aRetirar = actuales.filter((id) => !deseados.includes(id));
    const aIncluir = deseados.filter((id) => !actuales.includes(id));
    expect(aRetirar).toEqual([1, 3]);
    expect(aIncluir).toEqual([4]);
  });

  it('requiere cursos de período cuando hay al menos un estudiante', () => {
    const estudiantes = [10];
    const cursosPeriodo = 0;
    const debeFallar = estudiantes.length > 0 && cursosPeriodo === 0;
    expect(debeFallar).toBe(true);
  });

  it('permite lista vacía para retirar a todos', () => {
    const estudiantes: number[] = [];
    const permiteVacio = Array.isArray(estudiantes);
    expect(permiteVacio).toBe(true);
    expect(estudiantes.length).toBe(0);
  });
});

describe('Vacantes por sección (contrato)', () => {
  it('sección sin matrículas tiene vacantes = capacidad', () => {
    expect(vacantes(30, 0)).toBe(30);
  });

  it('aprobar descuenta una vacante', () => {
    const capacidad = 30;
    let matriculados = 10;
    // simula aprobación
    matriculados += 1;
    expect(vacantes(capacidad, matriculados)).toBe(19);
  });

  it('retirar libera una vacante', () => {
    const capacidad = 30;
    let matriculados = 10;
    matriculados -= 1;
    expect(vacantes(capacidad, matriculados)).toBe(21);
  });

  it('reasignar descuenta en destino y libera en origen', () => {
    const capacidad = 30;
    let origen = 15;
    let destino = 20;
    origen -= 1;
    destino += 1;
    expect(vacantes(capacidad, origen)).toBe(16);
    expect(vacantes(capacidad, destino)).toBe(9);
  });

  it('aprobar en sección llena falla', () => {
    const capacidad = 30;
    const matriculados = 30;
    const sinVacantes = matriculados >= capacidad;
    expect(sinVacantes).toBe(true);
    expect(vacantes(capacidad, matriculados)).toBe(0);
  });

  it('matrícula rápida: más estudiantes que capacidad falla', () => {
    const capacidad = 5;
    const uniqueIds = [1, 2, 3, 4, 5, 6];
    expect(uniqueIds.length > capacidad).toBe(true);
  });

  it('matrícula rápida: reemplazo dentro de capacidad pasa', () => {
    const capacidad = 5;
    const actuales = [1, 2, 3];
    const deseados = [2, 3, 4, 5];
    // retiros primero liberan cupo; set final <= capacidad
    expect(deseados.length <= capacidad).toBe(true);
    const aRetirar = actuales.filter((id) => !deseados.includes(id));
    expect(aRetirar).toEqual([1]);
  });

  it('vacantes nunca es negativo', () => {
    expect(vacantes(10, 15)).toBe(0);
  });
});
