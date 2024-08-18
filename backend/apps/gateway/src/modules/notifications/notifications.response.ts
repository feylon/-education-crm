import { NotificationType } from '@app/common/enums';
import { ApiProperty } from '@nestjs/swagger';

export class NotificationResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() userId: string;
  @ApiProperty({ enum: NotificationType }) type: NotificationType;
  @ApiProperty() title: string;
  @ApiProperty() body: string;
  @ApiProperty({ nullable: true }) data: Record<string, unknown> | null;
  @ApiProperty() isRead: boolean;
  @ApiProperty({ nullable: true }) readAt: Date | null;
  @ApiProperty() createdAt: Date;
}
