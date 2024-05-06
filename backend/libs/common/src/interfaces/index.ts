export interface RequestMeta {
  userId: string;
  email: string;
  roles: string[];
  permissions: string[];
  ip?: string;
  userAgent?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  items: T[];
  meta: PaginationMeta;
}

export interface JwtPayload {
  sub: string;
  email: string;
  roles: string[];
  permissions: string[];
  type: 'access' | 'refresh';
  jti?: string;
}

export interface RpcErrorPayload {
  statusCode: number;
  message: string;
  errors?: string[];
}

export interface WithMeta<T> {
  meta: RequestMeta;
  data: T;
}

export interface AuditEventPayload {
  userId?: string;
  userEmail?: string;
  action: string;
  entity: string;
  entityId?: string;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  ip?: string;
  userAgent?: string;
}
