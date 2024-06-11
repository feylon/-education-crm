import { AuditPublisher } from '@app/common/audit';
import { Course, CourseCategory, Group } from '@app/database';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriesService } from './categories.service';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';

@Module({
  imports: [TypeOrmModule.forFeature([Course, CourseCategory, Group])],
  controllers: [CoursesController],
  providers: [CoursesService, CategoriesService, AuditPublisher],
})
export class CoursesModule {}
