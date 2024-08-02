import { Module } from '@nestjs/common';
import { RoomsController } from './rooms.controller';
import { SchedulesController } from './schedules.controller';

@Module({ controllers: [SchedulesController, RoomsController] })
export class SchedulesModule {}
