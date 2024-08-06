export interface UploadFilePayload {
  originalName: string;
  mimeType: string;
  size: number;
  category: string;
  content: string;
}

export interface StoredFileView {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  category: string;
  url: string;
  createdAt: Date;
}

export interface FileContent extends StoredFileView {
  content: string;
}
