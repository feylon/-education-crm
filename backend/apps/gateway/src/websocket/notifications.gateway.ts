import { JwtPayload } from '@app/common/interfaces';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OnGatewayConnection, OnGatewayDisconnect, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: { origin: true, credentials: true }, transports: ['websocket', 'polling'] })
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  handleConnection(client: Socket): void {
    const token = this.extractToken(client);
    if (!token) {
      client.disconnect(true);
      return;
    }
    try {
      const payload = this.jwt.verify<JwtPayload>(token, { secret: this.config.getOrThrow<string>('JWT_SECRET') });
      if (payload.type !== 'access') {
        throw new Error('Access token required');
      }
      client.data.userId = payload.sub;
      void client.join(`user:${payload.sub}`);
      for (const role of payload.roles) {
        void client.join(`role:${role}`);
      }
      this.logger.debug(`Socket ${client.id} joined user:${payload.sub}`);
    } catch (error) {
      this.logger.warn(`Socket ${client.id} rejected: ${error instanceof Error ? error.message : String(error)}`);
      client.emit('unauthorized', { message: 'Invalid or expired token' });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    this.logger.debug(`Socket ${client.id} disconnected`);
  }

  pushToUser(userId: string, event: string, payload: unknown): void {
    this.server?.to(`user:${userId}`).emit(event, payload);
  }

  private extractToken(client: Socket): string | null {
    const auth = client.handshake.auth as { token?: string } | undefined;
    if (auth?.token) {
      return auth.token;
    }
    const header = client.handshake.headers.authorization;
    if (typeof header === 'string' && header.startsWith('Bearer ')) {
      return header.slice(7);
    }
    const query = client.handshake.query.token;
    return typeof query === 'string' ? query : null;
  }
}
