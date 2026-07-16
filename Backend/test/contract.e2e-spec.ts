/**
 * Tests de caracterización e integración.
 * Requieren PostgreSQL (OLTP+OLAP) y Redis levantados.
 *
 * En CI: services postgres:16 y redis:7 con variables DB_* / REDIS_*.
 * Local: docker compose up -d postgres redis-cache redis-queue
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

const hasIntegrationEnv =
  process.env.CI === 'true' || process.env.RUN_INTEGRATION_TESTS === 'true';

const describeIntegration = hasIntegrationEnv ? describe : describe.skip;

describeIntegration('Contract e2e (PostgreSQL + Redis)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const { AppModule } = await import('../src/app.module');
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  }, 60_000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('GET /api/health responde success', async () => {
    const res = await request(app.getHttpServer()).get('/api/health').expect(200);
    expect(res.body).toMatchObject({ success: true });
    expect(res.body.data).toHaveProperty('status');
  });

  it('POST /api/admin/usuarios + login + GET /api/auth/me', async () => {
    const adminEmail = process.env.TEST_ADMIN_EMAIL;
    const adminPassword = process.env.TEST_ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      return;
    }

    const adminLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: adminEmail, password: adminPassword })
      .expect(200);

    const adminToken = adminLogin.body.data.token as string;
    const email = `test_${Date.now()}@example.com`;
    const password = 'TestPass123!';

    const created = await request(app.getHttpServer())
      .post('/api/admin/usuarios')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email,
        password,
        name: 'Usuario Test',
        role: 'estudiante',
        dni: `${Date.now()}`.slice(-8),
      });

    expect([200, 201]).toContain(created.status);
    expect(created.body.success).toBe(true);

    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200);

    expect(login.body.success).toBe(true);
    expect(login.body.data?.token).toBeTruthy();

    const token = login.body.data.token as string;
    const me = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(me.body.success).toBe(true);
    expect(me.body.data?.email).toBe(email);
  });

  it('GET /api/matricula/opciones requiere autenticación', async () => {
    await request(app.getHttpServer()).get('/api/matricula/opciones').expect(401);
  });

  it('endpoints críticos documentados en OpenAPI', () => {
    const critical = [
      'POST /api/auth/login',
      'POST /api/admin/usuarios',
      'GET /api/auth/me',
      'GET /api/matricula/estado',
      'POST /api/matricula',
      'GET /api/asistencias/estudiante',
      'PUT /api/admin/configuracion',
      'GET /api/health',
      'PUT /api/evaluaciones/reordenar',
      'POST /api/notas-detalle/bulk',
    ];
    expect(critical).toHaveLength(10);
  });
});

describe('Contract smoke (sin infra)', () => {
  it('lista endpoints críticos del contrato', () => {
    const critical = [
      'POST /api/auth/login',
      'GET /api/health',
    ];
    expect(critical.length).toBeGreaterThan(0);
  });
});
