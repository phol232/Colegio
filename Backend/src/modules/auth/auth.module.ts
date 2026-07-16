import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { AuthController } from './presentation/auth.controller';
import { LoginUseCase } from './application/login.use-case';
import { LogoutUseCase } from './application/logout.use-case';

@Module({
  imports: [CommonModule],
  controllers: [AuthController],
  providers: [LoginUseCase, LogoutUseCase],
})
export class AuthModule {}
