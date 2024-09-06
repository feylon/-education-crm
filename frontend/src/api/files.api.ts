import { http, unwrap } from './http';
import type { StoredFile } from './types';

export const filesApi = {
  upload: (file: File, category: string) => {
    const form = new FormData();
    form.append('file', file);
    return unwrap<StoredFile>(http.post('/files', form, { params: { category }, headers: { 'Content-Type': 'multipart/form-data' } }));
  },
  remove: (id: string) => unwrap<{ deleted: boolean }>(http.delete(`/files/${id}`)),
};
