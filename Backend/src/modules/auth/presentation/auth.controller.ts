import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { Public } from '../../../common/decorators/public.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthUser } from '../../../common/guards/auth-token.guard';
import { ok } from '../../../common/dto/api-response';
import { LoginUseCase } from '../application/login.use-case';
import { LogoutUseCase } from '../application/logout.use-case';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly logoutUseCase: LogoutUseCase,
  ) {}

  @Public()
  @Throttle({ default: { limit: 200, ttl: 60_000 } })
  @Post('login')
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.loginUseCase.execute(dto);
    res.status(result.success ? 200 : 401);
    return result;
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@Req() req: Request & { authToken?: string }) {
    const token = req.authToken;
    if (!token) {
      throw new UnauthorizedException('Token no proporcionado');
    }
    return this.logoutUseCase.execute(token);
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return ok(user);
  }
}
