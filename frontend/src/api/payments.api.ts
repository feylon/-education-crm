import { cleanQuery, http, unwrap } from './http';
import type { Debtor, Invoice, InvoiceGenerationResult, ListQuery, Paginated, Payment, PaymentMethod, StudentFinanceSummary } from './types';

export interface PaymentPayload {
  studentId: string;
  amount: number;
  method: PaymentMethod;
  invoiceId?: string;
  groupId?: string;
  paidAt?: string;
  description?: string;
}

export interface InvoicePayload {
  studentId: string;
  groupId?: string;
  periodMonth: string;
  amount: number;
  dueDate: string;
  description?: string;
}

export const paymentsApi = {
  list: (query: ListQuery) => unwrap<Paginated<Payment>>(http.get('/payments', { params: cleanQuery(query) })),
  get: (id: string) => unwrap<Payment>(http.get(`/payments/${id}`)),
  create: (payload: PaymentPayload) => unwrap<Payment>(http.post('/payments', payload)),
  refund: (id: string, reason: string) => unwrap<Payment>(http.post(`/payments/${id}/refund`, { reason })),
  cancel: (id: string, reason: string) => unwrap<Payment>(http.post(`/payments/${id}/cancel`, { reason })),
  debtors: (query: ListQuery) => unwrap<Paginated<Debtor>>(http.get('/payments/debtors', { params: cleanQuery(query) })),
  studentSummary: (studentId: string) => unwrap<StudentFinanceSummary>(http.get(`/payments/students/${studentId}/summary`)),
  studentHistory: (studentId: string, query: ListQuery) =>
    unwrap<Paginated<Payment>>(http.get(`/payments/students/${studentId}/history`, { params: cleanQuery(query) })),
  groupSummary: (groupId: string) =>
    unwrap<{ groupId: string; invoiced: number; paid: number; outstanding: number; debtors: number }>(http.get(`/payments/groups/${groupId}/summary`)),
  invoices: (query: ListQuery) => unwrap<Paginated<Invoice>>(http.get('/invoices', { params: cleanQuery(query) })),
  invoice: (id: string) => unwrap<Invoice>(http.get(`/invoices/${id}`)),
  createInvoice: (payload: InvoicePayload) => unwrap<Invoice>(http.post('/invoices', payload)),
  updateInvoice: (id: string, payload: Partial<Pick<InvoicePayload, 'amount' | 'dueDate' | 'description'>>) =>
    unwrap<Invoice>(http.patch(`/invoices/${id}`, payload)),
  cancelInvoice: (id: string) => unwrap<Invoice>(http.post(`/invoices/${id}/cancel`)),
  generateInvoices: (payload: { periodMonth: string; groupId?: string; dueDay?: number }) =>
    unwrap<InvoiceGenerationResult>(http.post('/invoices/generate', payload)),
};
