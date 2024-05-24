import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, ApiProperty, getSchemaPath } from '@nestjs/swagger';

export class PaginationMetaDto {
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() total: number;
  @ApiProperty() totalPages: number;
}

export class ErrorResponseDto {
  @ApiProperty({ example: false }) success: boolean;
  @ApiProperty({ example: 400 }) statusCode: number;
  @ApiProperty({ example: 'Validation failed' }) message: string;
  @ApiProperty({ type: [String] }) errors: string[];
  @ApiProperty() path: string;
  @ApiProperty() timestamp: string;
}

const envelope = (dataSchema: Record<string, unknown>) => ({
  properties: {
    success: { type: 'boolean', example: true },
    statusCode: { type: 'number', example: 200 },
    data: dataSchema,
  },
});

export const ApiOkEnvelope = <TModel extends Type<unknown>>(model?: TModel, description?: string) =>
  model
    ? applyDecorators(
        ApiExtraModels(model),
        ApiOkResponse({ description, schema: envelope({ $ref: getSchemaPath(model) }) }),
      )
    : applyDecorators(ApiOkResponse({ description, schema: envelope({ type: 'object' }) }));

export const ApiPaginatedEnvelope = <TModel extends Type<unknown>>(model: TModel, description?: string) =>
  applyDecorators(
    ApiExtraModels(model, PaginationMetaDto),
    ApiOkResponse({
      description,
      schema: envelope({
        properties: {
          items: { type: 'array', items: { $ref: getSchemaPath(model) } },
          meta: { $ref: getSchemaPath(PaginationMetaDto) },
        },
      }),
    }),
  );
