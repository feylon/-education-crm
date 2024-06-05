import { AUTH_PATTERNS } from '@app/common/constants';
import { ChangePasswordDto, LoginDto, RefreshTokenDto } from '@app/common/dto';
import { RequestMeta } from '@app/common/interfaces';
import { RpcClientService } from '@app/common/rpc';
import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { ApiOkEnvelope, Meta, Public, clientIp } from '../../common';
import { AuthUserResponseDto, LoginResponseDto, TokenPairResponseDto } from './auth.response';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly rpc: RpcClientService) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiOkEnvelope(LoginResponseDto)
  login(@Body() dto: LoginDto, @Req() request: Request) {
    return this.rpc.send(AUTH_PATTERNS.LOGIN, { dto, ip: clientIp(request), userAgent: request.headers['user-agent'] });
  }

  @Public()
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate refresh token and get a new access token' })
  @ApiOkEnvelope(TokenPairResponseDto)
  refresh(@Body() dto: RefreshTokenDto, @Req() request: Request) {
    return this.rpc.send(AUTH_PATTERNS.REFRESH, {
      refreshToken: dto.refreshToken,
      ip: clientIp(request),
      userAgent: request.headers['user-agent'],
    });
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke the given refresh token (or all tokens when omitted)' })
  @ApiOkEnvelope()
  logout(@Body() dto: Partial<RefreshTokenDto>, @Meta() meta: RequestMeta) {
    return this.rpc.send(AUTH_PATTERNS.LOGOUT, { meta, data: { refreshToken: dto.refreshToken } });
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Current user profile with roles and permissions' })
  @ApiOkEnvelope(AuthUserResponseDto)
  me(@Meta() meta: RequestMeta) {
    return this.rpc.send(AUTH_PATTERNS.ME, { meta });
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change own password' })
  @ApiOkEnvelope()
  changePassword(@Body() dto: ChangePasswordDto, @Meta() meta: RequestMeta) {
    return this.rpc.send(AUTH_PATTERNS.CHANGE_PASSWORD, { meta, data: dto });
  }
}
