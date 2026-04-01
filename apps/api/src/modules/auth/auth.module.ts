import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthManager } from './managers/auth.manager';
import { AuthService } from './services/auth.service';
import { AuthRepository } from './repositories/auth.repository';
import { JwtStrategy } from './guards/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { NotificationModule } from '../notification/notification.module';
import { RedisModule } from '../../infrastructure/redis/redis.module';
import { InitiateRegisterHandler } from './commands/initiate-register/initiate-register.handler';
import { VerifyRegisterHandler } from './commands/verify-register/verify-register.handler';
import { LoginHandler } from './commands/login/login.handler';
import { RefreshTokenHandler } from './commands/refresh-token/refresh-token.handler';
import { LogoutHandler } from './commands/logout/logout.handler';

const CommandHandlers = [
  InitiateRegisterHandler,
  VerifyRegisterHandler,
  LoginHandler,
  RefreshTokenHandler,
  LogoutHandler,
];

@Module({
  imports: [
    PassportModule,
    JwtModule.register({}),
    NotificationModule,
    RedisModule,
  ],
  controllers: [AuthController],
  providers: [
    ...CommandHandlers,
    // Guards / Strategy
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
    // Layers: Manager → Service → Repository
    AuthManager,
    AuthService,
    AuthRepository,
  ],
  exports: [JwtAuthGuard, RolesGuard, JwtStrategy],
})
export class AuthModule {}
