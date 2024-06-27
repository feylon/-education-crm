import { Module } from '@nestjs/common';
import { TeachersController } from './teachers.controller';

@Module({ controllers: [TeachersController] })
export class TeachersModule {}
