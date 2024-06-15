import { bootstrapMicroservice } from '@app/common/bootstrap';
import { AppModule } from './app.module';

bootstrapMicroservice(AppModule, 'StudentService');
