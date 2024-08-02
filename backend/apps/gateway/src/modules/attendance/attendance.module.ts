import { Module } from '@nestjs/common';
import { AttendanceController } from './attendance.controller';
import { LessonsController } from './lessons.controller';

@Module({ controllers: [LessonsController, AttendanceController] })
export class AttendanceModule {}
