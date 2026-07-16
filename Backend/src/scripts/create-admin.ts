import 'reflect-metadata';
import * as bcrypt from 'bcrypt';
import { OltpDataSource } from '../infrastructure/typeorm/data-source.oltp';
import { UsuarioEntity } from '../infrastructure/typeorm/entities/oltp/usuario.entity';

const EMAIL = process.env.ADMIN_EMAIL ?? 'director@gmail.com';
const PASSWORD = process.env.ADMIN_PASSWORD ?? 'prueba123@';
const NAME = process.env.ADMIN_NAME ?? 'Director';

async function main(): Promise<void> {
  await OltpDataSource.initialize();

  try {
    const repo = OltpDataSource.getRepository(UsuarioEntity);
    const passwordHash = await bcrypt.hash(PASSWORD, 10);

    const existing = await repo.findOne({ where: { email: EMAIL } });

    if (existing) {
      existing.password = passwordHash;
      existing.role = 'admin';
      existing.activo = true;
      existing.name = existing.name || NAME;
      await repo.save(existing);
      console.log(`✅ Usuario admin actualizado: ${EMAIL} (id=${existing.id})`);
    } else {
      const created = repo.create({
        email: EMAIL,
        password: passwordHash,
        name: NAME,
        role: 'admin',
        activo: true,
      });
      const saved = await repo.save(created);
      console.log(`✅ Usuario admin creado: ${EMAIL} (id=${saved.id})`);
    }

    console.log(`   Contraseña: ${PASSWORD}`);
  } finally {
    await OltpDataSource.destroy();
  }
}

main().catch((error) => {
  console.error('❌ Error al crear el usuario admin:', error);
  process.exit(1);
});
