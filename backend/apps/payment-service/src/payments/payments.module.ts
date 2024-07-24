import { AuditPublisher } from '@app/common/audit';
import { Group, GroupStudent, Invoice, Payment, PaymentAllocation, Student, Teacher } from '@app/database';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillingJobs } from './billing.jobs';
import { DebtService } from './debt.service';
import { InvoicesService } from './invoices.service';
import { NumberingService } from './numbering.service';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { ScopeService } from './scope.service';

@Module({
  imports: [TypeOrmModule.forFeature([Invoice, Payment, PaymentAllocation, Student, GroupStudent, Group, Teacher])],
  controllers: [PaymentsController],
  providers: [InvoicesService, PaymentsService, DebtService, NumberingService, ScopeService, BillingJobs, AuditPublisher],
})
export class PaymentsModule {}
