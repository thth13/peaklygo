import { ArrayNotEmpty, IsArray, IsMongoId } from 'class-validator';

export class MarkNotificationsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsMongoId({ each: true })
  notificationIds: string[];
}
