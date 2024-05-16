import { InvoiceStatus } from '../enums';
import {
  allocatePayment,
  computeBalance,
  computeInvoiceAmount,
  resolveInvoiceStatus,
  AllocatableInvoice,
} from './billing.util';

const invoice = (overrides: Partial<AllocatableInvoice>): AllocatableInvoice => ({
  id: 'inv',
  amount: 100,
  paidAmount: 0,
  status: InvoiceStatus.PENDING,
  dueDate: '2024-06-10',
  periodMonth: '2024-06-01',
  ...overrides,
});

describe('computeInvoiceAmount', () => {
  it('applies a percentage discount and rounds to cents', () => {
    expect(computeInvoiceAmount(500000, 10)).toBe(450000);
    expect(computeInvoiceAmount(333.33, 33)).toBe(223.33);
  });

  it('clamps the discount between 0 and 100', () => {
    expect(computeInvoiceAmount(100, 150)).toBe(0);
    expect(computeInvoiceAmount(100, -5)).toBe(100);
  });
});

describe('allocatePayment', () => {
  it('pays the oldest invoices first and splits across several', () => {
    const invoices = [
      invoice({ id: 'b', periodMonth: '2024-06-01', dueDate: '2024-06-10' }),
      invoice({ id: 'a', periodMonth: '2024-05-01', dueDate: '2024-05-10', paidAmount: 40 }),
      invoice({ id: 'c', periodMonth: '2024-07-01', dueDate: '2024-07-10' }),
    ];
    expect(allocatePayment(invoices, 130)).toEqual([
      { invoiceId: 'a', amount: 60 },
      { invoiceId: 'b', amount: 70 },
    ]);
  });

  it('skips paid and cancelled invoices', () => {
    const invoices = [
      invoice({ id: 'paid', paidAmount: 100, status: InvoiceStatus.PAID }),
      invoice({ id: 'cancelled', status: InvoiceStatus.CANCELLED }),
      invoice({ id: 'open', periodMonth: '2024-08-01' }),
    ];
    expect(allocatePayment(invoices, 50)).toEqual([{ invoiceId: 'open', amount: 50 }]);
  });

  it('returns nothing when there is nothing to allocate', () => {
    expect(allocatePayment([], 50)).toEqual([]);
    expect(allocatePayment([invoice({})], 0)).toEqual([]);
  });
});

describe('resolveInvoiceStatus', () => {
  it('moves through pending, partially paid, paid and overdue', () => {
    expect(resolveInvoiceStatus(invoice({}), '2024-06-01')).toBe(InvoiceStatus.PENDING);
    expect(resolveInvoiceStatus(invoice({ paidAmount: 30 }), '2024-06-01')).toBe(InvoiceStatus.PARTIALLY_PAID);
    expect(resolveInvoiceStatus(invoice({ paidAmount: 100 }), '2024-06-01')).toBe(InvoiceStatus.PAID);
    expect(resolveInvoiceStatus(invoice({ paidAmount: 30 }), '2024-06-11')).toBe(InvoiceStatus.OVERDUE);
    expect(resolveInvoiceStatus(invoice({ status: InvoiceStatus.CANCELLED }), '2024-06-11')).toBe(
      InvoiceStatus.CANCELLED,
    );
  });
});

describe('computeBalance', () => {
  it('derives debt from a negative balance only', () => {
    expect(computeBalance(300, 500)).toEqual({ balance: -200, debt: 200 });
    expect(computeBalance(600, 500)).toEqual({ balance: 100, debt: 0 });
  });
});
