import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface TelegramUser {
  id: number;
  first_name: string;
  username?: string;
}

export interface TelegramMessage {
  message_id: number;
  chat: { id: number; type: string };
  from?: TelegramUser;
  text?: string;
  contact?: { phone_number: string; user_id?: number; first_name: string };
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

interface TelegramResponse<T> {
  ok: boolean;
  result?: T;
  description?: string;
}

export interface ReplyMarkup {
  keyboard?: Array<Array<{ text: string; request_contact?: boolean }>>;
  resize_keyboard?: boolean;
  one_time_keyboard?: boolean;
  remove_keyboard?: boolean;
}

@Injectable()
export class TelegramApiService {
  private readonly logger = new Logger(TelegramApiService.name);
  private readonly token: string;
  readonly enabled: boolean;

  constructor(config: ConfigService) {
    this.token = config.get<string>('TELEGRAM_BOT_TOKEN', '');
    const flag = config.get<string>('TELEGRAM_BOT_ENABLED', 'false');
    this.enabled = this.token.length > 0 && (flag === 'true' || flag === '1');
  }

  async sendMessage(chatId: string | number, text: string, replyMarkup?: ReplyMarkup): Promise<boolean> {
    if (!this.enabled) {
      return false;
    }
    const result = await this.call<TelegramMessage>('sendMessage', {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      reply_markup: replyMarkup,
    });
    return result !== null;
  }

  async getUpdates(offset: number, timeoutSeconds: number): Promise<TelegramUpdate[]> {
    const updates = await this.call<TelegramUpdate[]>('getUpdates', {
      offset,
      timeout: timeoutSeconds,
      allowed_updates: ['message'],
    }, (timeoutSeconds + 10) * 1000);
    return updates ?? [];
  }

  private async call<T>(method: string, body: Record<string, unknown>, timeoutMs = 15000): Promise<T | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`https://api.telegram.org/bot${this.token}/${method}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const payload = (await response.json()) as TelegramResponse<T>;
      if (!payload.ok) {
        this.logger.warn(`Telegram ${method} failed: ${payload.description ?? response.status}`);
        return null;
      }
      return payload.result ?? null;
    } catch (error) {
      this.logger.warn(`Telegram ${method} error: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
}
