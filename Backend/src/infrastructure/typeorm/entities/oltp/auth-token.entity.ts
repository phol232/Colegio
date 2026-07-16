import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UsuarioEntity } from './usuario.entity';

@Entity('auth_tokens')
@Index('idx_auth_tokens_token', ['token'])
@Index('idx_auth_tokens_usuario', ['usuarioId'])
@Index('idx_auth_tokens_expires', ['expiresAt'])
export class AuthTokenEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column({ name: 'usuario_id', type: 'bigint' })
  usuarioId!: number;

  @Column({ name: 'token', type: 'varchar', length: 64, unique: true })
  token!: string;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt!: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @ManyToOne(() => UsuarioEntity, (usuario) => usuario.authTokens, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuario_id' })
  usuario!: UsuarioEntity;
}
