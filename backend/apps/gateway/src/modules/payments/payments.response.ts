import { InvoiceStatus, PaymentMethod, PaymentStatus } from '@app/common/enums';
import { ApiProperty } from '@nestjs/swagger';

export class InvoiceResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() number: string;
  @ApiProperty() studentId: string;
  @ApiProperty({ nullable: true }) groupId: string | null;
  @ApiProperty() periodMonth: string;
  @ApiProperty() amount: number;
  @ApiProperty() paidAmount: number;
  @ApiProperty() dueDate: string;
  @ApiProperty({ enum: InvoiceStatus }) status: InvoiceStatus;
  @ApiProperty({ nullable: true }) description: string | null;
}

export class PaymentResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() number: string;
  @ApiProperty() studentId: string;
  @ApiProperty({ nullable: true }) invoiceId: string | null;
  @ApiProperty({ nullable: true }) groupId: string | null;
  @ApiProperty() amount: number;
  @ApiProperty({ enum: PaymentMethod }) method: PaymentMethod;
  @ApiProperty({ enum: PaymentStatus }) status: PaymentStatus;
  @ApiProperty() paidAt: Date;
  @ApiProperty({ nullable: true }) description: string | null;
}

export class DebtorResponseDto {
  @ApiProperty() studentId: string;
  @ApiProperty() firstName: string;
  @ApiProperty() lastName: string;
  @ApiProperty() phone: string;
  @ApiProperty() totalInvoiced: number;
  @ApiProperty() totalPaid: number;
  @ApiProperty() debt: number;
  @ApiProperty() overdueInvoices: number;
  @ApiProperty({ nullable: true }) oldestDueDate: string | null;
  @ApiProperty({ type: [String] }) groups: string[];
}
