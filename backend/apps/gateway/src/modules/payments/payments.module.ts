import { Module } from '@nestjs/common';
import { InvoicesController } from './invoices.controller';
import { PaymentsController } from './payments.controller';

@Module({ controllers: [PaymentsController, InvoicesController] })
export class PaymentsModule {}
