import { FILE_PATTERNS } from '@app/common/constants';
import { UploadFilePayload } from '@app/common/dto';
import { WithMeta } from '@app/common/interfaces';
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { FilesService } from './files.service';

@Controller()
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @MessagePattern(FILE_PATTERNS.UPLOAD)
  upload(@Payload() payload: WithMeta<UploadFilePayload>) {
    return this.files.upload(payload.data, payload.meta);
  }

  @MessagePattern(FILE_PATTERNS.GET)
  get(@Payload() payload: { data: { id: string } }) {
    return this.files.get(payload.data.id);
  }

  @MessagePattern(FILE_PATTERNS.REMOVE)
  remove(@Payload() payload: WithMeta<{ id: string }>) {
    return this.files.remove(payload.data.id, payload.meta);
  }
}
