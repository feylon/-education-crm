import { AUTH_PATTERNS } from '@app/common/constants';
import { ChangePasswordDto, LoginDto } from '@app/common/dto';
import { RequestMeta, WithMeta } from '@app/common/interfaces';
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AuthService, ClientInfo } from './auth.service';

interface LoginPayload extends ClientInfo {
  dto: LoginDto;
}

interface RefreshPayload extends ClientInfo {
  refreshToken: string;
}

@Controller()
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @MessagePattern(AUTH_PATTERNS.LOGIN)
  login(@Payload() payload: LoginPayload) {
    return this.auth.login(payload.dto, { ip: payload.ip, userAgent: payload.userAgent });
  }

  @MessagePattern(AUTH_PATTERNS.REFRESH)
  refresh(@Payload() payload: RefreshPayload) {
    return this.auth.refresh(payload.refreshToken, { ip: payload.ip, userAgent: payload.userAgent });
  }

  @MessagePattern(AUTH_PATTERNS.LOGOUT)
  logout(@Payload() payload: WithMeta<{ refreshToken?: string }>) {
    return this.auth.logout(payload.data.refreshToken, payload.meta);
  }

  @MessagePattern(AUTH_PATTERNS.ME)
  me(@Payload() payload: { meta: RequestMeta }) {
    return this.auth.me(payload.meta.userId);
  }

  @MessagePattern(AUTH_PATTERNS.CHANGE_PASSWORD)
  changePassword(@Payload() payload: WithMeta<ChangePasswordDto>) {
    return this.auth.changePassword(payload.meta.userId, payload.data, payload.meta);
  }
}
