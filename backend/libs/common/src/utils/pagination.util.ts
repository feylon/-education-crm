import { ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { Paginated } from '../interfaces';
import { PaginationQueryDto } from '../dto';
import { SortOrder } from '../enums';

export const toPaginated = <T>(items: T[], total: number, query: PaginationQueryDto): Paginated<T> => ({
  items,
  meta: {
    page: query.page,
    limit: query.limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.limit)),
  },
});

export const applySorting = <T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  alias: string,
  query: PaginationQueryDto,
  allowed: string[],
  fallback = 'createdAt',
): SelectQueryBuilder<T> => {
  const field = query.sortBy && allowed.includes(query.sortBy) ? query.sortBy : fallback;
  return qb.orderBy(`${alias}.${field}`, query.sortOrder ?? SortOrder.DESC);
};

export const applyPagination = <T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  query: PaginationQueryDto,
): SelectQueryBuilder<T> => qb.skip((query.page - 1) * query.limit).take(query.limit);

export const paginateQuery = async <T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  query: PaginationQueryDto,
): Promise<Paginated<T>> => {
  const [items, total] = await applyPagination(qb, query).getManyAndCount();
  return toPaginated(items, total, query);
};
