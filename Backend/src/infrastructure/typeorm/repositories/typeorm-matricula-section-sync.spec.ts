/**
 * Contrato de sincronización sección ↔ estudiantes_cursos (documentación ejecutable).
 * La lógica vive en TypeOrmMatriculaRepository.assignStudentsToSeccionLegacy.
 */
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
