import { cleanQuery, http, unwrap } from './http';
import type { Course, CourseCategory, CourseStatus, ListQuery, Paginated } from './types';

export interface CoursePayload {
  name: string;
  description?: string;
  categoryId?: string;
  durationMonths?: number;
  price: number;
  status?: CourseStatus;
  color?: string;
}

export interface CategoryPayload {
  name: string;
  description?: string;
}

export const coursesApi = {
  list: (query: ListQuery) => unwrap<Paginated<Course>>(http.get('/courses', { params: cleanQuery(query) })),
  get: (id: string) => unwrap<Course>(http.get(`/courses/${id}`)),
  create: (payload: CoursePayload) => unwrap<Course>(http.post('/courses', payload)),
  update: (id: string, payload: Partial<CoursePayload>) => unwrap<Course>(http.patch(`/courses/${id}`, payload)),
  remove: (id: string) => unwrap<{ deleted: boolean }>(http.delete(`/courses/${id}`)),
  categories: () => unwrap<CourseCategory[]>(http.get('/courses/categories')),
  createCategory: (payload: CategoryPayload) => unwrap<CourseCategory>(http.post('/courses/categories', payload)),
  updateCategory: (id: string, payload: Partial<CategoryPayload>) => unwrap<CourseCategory>(http.patch(`/courses/categories/${id}`, payload)),
  removeCategory: (id: string) => unwrap<{ deleted: boolean }>(http.delete(`/courses/categories/${id}`)),
};
