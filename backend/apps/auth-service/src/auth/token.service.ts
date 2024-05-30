import { JwtPayload } from '@app/common/interfaces';
import { RpcUnauthorizedException } from '@app/common/rpc';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomUUID } from 'crypto';

export interface SignedTokens {
  accessToken: string;
  refreshToken: string;
  refreshJti: string;
  expiresIn: number;
  refreshExpiresAt: Date;
}

const DURATION_UNITS: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };

export const parseDurationSeconds = (value: string): number => {
  const match = /^(\d+)([smhd])$/.exec(value.trim());
  if (!match) {
    return Number(value) || 900;
  }
  return Number(match[1]) * DURATION_UNITS[match[2]];
};

@Injectable()
export class TokenService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly accessTtl: number;
  private readonly refreshTtl: number;

  constructor(
    private readonly jwt: JwtService,
    config: ConfigService,
  ) {
    this.accessSecret = config.getOrThrow<string>('JWT_SECRET');
    this.refreshSecret = config.getOrThrow<string>('JWT_REFRESH_SECRET');
    this.accessTtl = parseDurationSeconds(config.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'));
    this.refreshTtl = parseDurationSeconds(config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'));
  }

  sign(payload: Omit<JwtPayload, 'type' | 'jti'>): SignedTokens {
    const refreshJti = randomUUID();
    const accessToken = this.jwt.sign({ ...payload, type: 'access' }, { secret: this.accessSecret, expiresIn: this.accessTtl });
    const refreshToken = this.jwt.sign(
      { sub: payload.sub, email: payload.email, roles: [], permissions: [], type: 'refresh', jti: refreshJti },
      { secret: this.refreshSecret, expiresIn: this.refreshTtl },
    );
    return {
      accessToken,
      refreshToken,
      refreshJti,
      expiresIn: this.accessTtl,
      refreshExpiresAt: new Date(Date.now() + this.refreshTtl * 1000),
    };
  }

  verifyRefresh(token: string): JwtPayload {
    try {
      const payload = this.jwt.verify<JwtPayload>(token, { secret: this.refreshSecret });
      if (payload.type !== 'refresh' || !payload.jti) {
        throw new RpcUnauthorizedException('Invalid refresh token');
      }
      return payload;
    } catch (error) {
      if (error instanceof RpcUnauthorizedException) {
        throw error;
      }
      throw new RpcUnauthorizedException('Refresh token is invalid or expired');
    }
  }

  hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
