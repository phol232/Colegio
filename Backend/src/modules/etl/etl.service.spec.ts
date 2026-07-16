import { EtlService } from './etl.service';
import { ServiceUnavailableException } from '@nestjs/common';

describe('EtlService lock', () => {
  const oltpDataSource = { query: jest.fn() };
  const olapDataSource = { transaction: jest.fn() };
  const analyticsRepository = { getGeneralStats: jest.fn() };
  const dimEstudianteRepo = { upsert: jest.fn(), findOne: jest.fn() };
  const dimDocenteRepo = { upsert: jest.fn(), findOne: jest.fn() };
  const dimGradoRepo = { upsert: jest.fn(), findOne: jest.fn() };
  const dimSeccionRepo = { upsert: jest.fn(), findOne: jest.fn() };
  const dimCursoRepo = { upsert: jest.fn(), findOne: jest.fn() };
  const dimTiempoRepo = {
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const factRepo = { upsert: jest.fn(), count: jest.fn() };
  const controlEtlRepo = { save: jest.fn() };
  const cache = { delByPattern: jest.fn() };
  const redis = {
    set: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
  };

  let service: EtlService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new EtlService(
      oltpDataSource as never,
      olapDataSource as never,
      analyticsRepository as never,
      dimEstudianteRepo as never,
      dimDocenteRepo as never,
      dimGradoRepo as never,
      dimSeccionRepo as never,
      dimCursoRepo as never,
      dimTiempoRepo as never,
      factRepo as never,
      controlEtlRepo as never,
      cache as never,
      redis as never,
    );
  });

  it('no ejecuta sync si no obtiene el lock', async () => {
    redis.set.mockResolvedValue(null);
    await expect(service.run('incremental')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(oltpDataSource.query).not.toHaveBeenCalled();
  });
});
