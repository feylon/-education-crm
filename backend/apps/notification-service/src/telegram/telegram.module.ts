import { Invoice, Parent, Student, User } from '@app/database';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelegramApiService } from './telegram-api.service';
import { TelegramBotService } from './telegram-bot.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Student, Parent, Invoice])],
  providers: [TelegramApiService, TelegramBotService],
  exports: [TelegramApiService],
})
export class TelegramModule {}
