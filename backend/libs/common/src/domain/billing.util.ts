import { InvoiceStatus } from '../enums';

export const roundMoney = (value: number): number => Math.round(value * 100) / 100;

export const computeInvoiceAmount = (monthlyFee: number, discountPercent: number): number =>
  roundMoney(monthlyFee * (1 - Math.min(Math.max(discountPercent, 0), 100) / 100));

export interface AllocatableInvoice {
  id: string;
  amount: number;
  paidAmount: number;
  status: InvoiceStatus;
  dueDate: string;
  periodMonth: string;
}

export interface AllocationResult {
  invoiceId: string;
  amount: number;
}

export const outstandingOf = (invoice: Pick<AllocatableInvoice, 'amount' | 'paidAmount'>): number =>
  roundMoney(Math.max(0, invoice.amount - invoice.paidAmount));

export const isOpenInvoice = (invoice: Pick<AllocatableInvoice, 'status' | 'amount' | 'paidAmount'>): boolean =>
  invoice.status !== InvoiceStatus.CANCELLED && invoice.status !== InvoiceStatus.PAID && outstandingOf(invoice) > 0;

export const sortInvoicesFifo = <T extends Pick<AllocatableInvoice, 'periodMonth' | 'dueDate'>>(invoices: T[]): T[] =>
  [...invoices].sort((a, b) => {
    const period = a.periodMonth.localeCompare(b.periodMonth);
    return period !== 0 ? period : a.dueDate.localeCompare(b.dueDate);
  });

export const allocatePayment = (invoices: AllocatableInvoice[], amount: number): AllocationResult[] => {
  const allocations: AllocationResult[] = [];
  let remaining = roundMoney(amount);
  for (const invoice of sortInvoicesFifo(invoices.filter(isOpenInvoice))) {
    if (remaining <= 0) {
      break;
    }
    const portion = Math.min(remaining, outstandingOf(invoice));
    if (portion > 0) {
      allocations.push({ invoiceId: invoice.id, amount: roundMoney(portion) });
      remaining = roundMoney(remaining - portion);
    }
  }
  return allocations;
};

export const resolveInvoiceStatus = (
  invoice: Pick<AllocatableInvoice, 'amount' | 'paidAmount' | 'dueDate' | 'status'>,
  today: string,
): InvoiceStatus => {
  if (invoice.status === InvoiceStatus.CANCELLED) {
    return InvoiceStatus.CANCELLED;
  }
  if (invoice.paidAmount >= invoice.amount) {
    return InvoiceStatus.PAID;
  }
  if (invoice.dueDate < today) {
    return InvoiceStatus.OVERDUE;
  }
  return invoice.paidAmount > 0 ? InvoiceStatus.PARTIALLY_PAID : InvoiceStatus.PENDING;
};

export const computeBalance = (totalPaid: number, totalInvoiced: number): { balance: number; debt: number } => {
  const balance = roundMoney(totalPaid - totalInvoiced);
  return { balance, debt: roundMoney(Math.max(0, -balance)) };
};
