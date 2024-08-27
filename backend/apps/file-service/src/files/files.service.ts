import { AuditPublisher } from '@app/common/audit';
import { FileContent, StoredFileView, UploadFilePayload } from '@app/common/dto';
import { AuditAction } from '@app/common/enums';
import { RequestMeta } from '@app/common/interfaces';
import { RpcNotFoundException } from '@app/common/rpc';
import { StoredFile } from '@app/database';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import { extname, join, resolve } from 'path';
import { Repository } from 'typeorm';

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'application/pdf': '.pdf',
};

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  private readonly root: string;

  constructor(
    @InjectRepository(StoredFile) private readonly files: Repository<StoredFile>,
    private readonly audit: AuditPublisher,
    config: ConfigService,
  ) {
    this.root = resolve(config.get<string>('FILE_STORAGE_PATH', './uploads'));
  }

  async upload(payload: UploadFilePayload, meta: RequestMeta): Promise<StoredFileView> {
    const extension = EXTENSION_BY_MIME[payload.mimeType] ?? extname(payload.originalName).toLowerCase() ?? '';
    const relativePath = join(payload.category, `${randomUUID()}${extension}`);
    const absolutePath = join(this.root, relativePath);
    await mkdir(join(this.root, payload.category), { recursive: true });
    await writeFile(absolutePath, Buffer.from(payload.content, 'base64'));
    const file = await this.files.save(
      this.files.create({
        originalName: payload.originalName.slice(0, 255),
        mimeType: payload.mimeType,
        size: payload.size,
        path: relativePath,
        category: payload.category,
        uploadedById: meta.userId || null,
      }),
    );
    this.audit.publish(meta, AuditAction.CREATE, 'File', file.id, null, { originalName: file.originalName, size: file.size, category: file.category });
    this.logger.log(`Stored ${file.originalName} (${file.size} bytes) as ${relativePath}`);
    return this.toView(file);
  }

  async get(id: string): Promise<FileContent> {
    const file = await this.files.findOne({ where: { id } });
    if (!file) {
      throw new RpcNotFoundException('File not found');
    }
    try {
      const content = await readFile(join(this.root, file.path));
      return { ...this.toView(file), content: content.toString('base64') };
    } catch {
      throw new RpcNotFoundException('File content is missing from storage');
    }
  }

  async remove(id: string, meta: RequestMeta): Promise<{ deleted: boolean }> {
    const file = await this.files.findOne({ where: { id } });
    if (!file) {
      throw new RpcNotFoundException('File not found');
    }
    await unlink(join(this.root, file.path)).catch(() => undefined);
    await this.files.remove(file);
    this.audit.publish(meta, AuditAction.DELETE, 'File', id, { originalName: file.originalName }, null);
    return { deleted: true };
  }

  private toView(file: StoredFile): StoredFileView {
    return {
      id: file.id,
      originalName: file.originalName,
      mimeType: file.mimeType,
      size: file.size,
      category: file.category,
      url: `/api/v1/files/${file.id}`,
      createdAt: file.createdAt,
    };
  }
}
