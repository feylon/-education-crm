import { FILE_PATTERNS } from '@app/common/constants';
import { FileContent, StoredFileView, UploadFilePayload } from '@app/common/dto';
import { RequestMeta } from '@app/common/interfaces';
import { RpcClientService } from '@app/common/rpc';
import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { ApiOkEnvelope, Meta, Public, RequirePermissions } from '../../common';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
const UPLOAD_LIMIT_BYTES = Number(process.env.MAX_FILE_SIZE_MB ?? 5) * 1024 * 1024;

@ApiTags('Files')
@Controller('files')
export class FilesController {
  private readonly maxBytes: number;

  constructor(
    private readonly rpc: RpcClientService,
    config: ConfigService,
  ) {
    this.maxBytes = config.get<number>('MAX_FILE_SIZE_MB', 5) * 1024 * 1024;
  }

  @Post()
  @ApiBearerAuth()
  @RequirePermissions('files.upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: UPLOAD_LIMIT_BYTES, files: 1 } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        category: { type: 'string', example: 'students' },
      },
    },
  })
  @ApiOperation({ summary: 'Upload an image or PDF (max MAX_FILE_SIZE_MB)' })
  @ApiOkEnvelope()
  upload(@UploadedFile() file: Express.Multer.File | undefined, @Query('category') category: string | undefined, @Meta() meta: RequestMeta) {
    if (!file) {
      throw new BadRequestException('A file is required (multipart field "file")');
    }
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      throw new BadRequestException(`Unsupported file type ${file.mimetype}`);
    }
    if (file.size > this.maxBytes) {
      throw new BadRequestException(`File exceeds the limit of ${this.maxBytes / 1024 / 1024} MB`);
    }
    const payload: UploadFilePayload = {
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      category: (category ?? 'general').replace(/[^a-z0-9_-]/gi, '').toLowerCase() || 'general',
      content: file.buffer.toString('base64'),
    };
    return this.rpc.send<StoredFileView>(FILE_PATTERNS.UPLOAD, { meta, data: payload });
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Download a stored file (public, unguessable id)' })
  async download(@Param('id', ParseUUIDPipe) id: string, @Res() response: Response): Promise<void> {
    const file = await this.rpc.send<FileContent>(FILE_PATTERNS.GET, { meta: null, data: { id } });
    response.setHeader('Content-Type', file.mimeType);
    response.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.originalName)}"`);
    response.setHeader('Cache-Control', 'public, max-age=86400');
    response.send(Buffer.from(file.content, 'base64'));
  }

  @Delete(':id')
  @ApiBearerAuth()
  @RequirePermissions('files.upload')
  @ApiOperation({ summary: 'Delete a stored file' })
  @ApiOkEnvelope()
  remove(@Param('id', ParseUUIDPipe) id: string, @Meta() meta: RequestMeta) {
    return this.rpc.send(FILE_PATTERNS.REMOVE, { meta, data: { id } });
  }
}
