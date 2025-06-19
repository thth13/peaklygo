import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDate,
  IsBoolean,
  IsNumber,
  IsEnum,
  IsObject,
  IsArray,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { plainToInstance, Transform, Type } from 'class-transformer';

class StepDto {
  @IsString()
  id: string;

  @IsString()
  text: string;
}

export class CreateGoalDto {
  @IsString()
  @IsNotEmpty()
  goalName: string;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  userId: string;

  @IsDate()
  @Transform(({ value }) => new Date(value))
  startDate: Date;

  @IsDate()
  @Transform(({ value }) => new Date(value))
  endDate: Date;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  noDeadline?: boolean;

  @IsOptional()
  image?: string;

  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        value = JSON.parse(value);
      } catch {
        return [];
      }
    }
    return Array.isArray(value)
      ? value.map((item) => plainToInstance(StepDto, item))
      : [];
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StepDto)
  steps: StepDto[];

  // @IsEnum(['checklist', 'days', 'numeric'])
  // trackingType: string;

  @IsString()
  @IsOptional()
  target?: string;

  @IsObject()
  @IsOptional()
  reminders?: {
    daily: boolean;
    weekly: boolean;
    beforeDeadline: boolean;
  };

  @IsString()
  @IsOptional()
  reward?: string;

  @IsString()
  @IsOptional()
  consequence?: string;

  @IsEnum(['private', 'friends', 'public'])
  @IsOptional()
  privacy?: string = 'private';

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsObject()
  publicationSettings?: {
    allowComments: boolean;
    showInFeed: boolean;
    autoPublishAchievements: boolean;
  } = {
    allowComments: true,
    showInFeed: true,
    autoPublishAchievements: false,
  };

  @IsBoolean()
  @IsOptional()
  isCompleted?: boolean = false;

  @IsString()
  @IsOptional()
  goalWorth?: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  progress?: number = 0;
}

export class UpdateGoalDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDate()
  @IsOptional()
  @Transform(({ value }) => new Date(value))
  targetDate?: Date;

  @IsBoolean()
  @IsOptional()
  isCompleted?: boolean;

  @IsNumber()
  @IsOptional()
  progress?: number;

  @IsEnum(['daily', 'weekly', 'monthly', 'yearly'])
  @IsOptional()
  frequency?: string;

  @IsString()
  value: string;

  @IsObject()
  @IsOptional()
  reminderSettings?: {
    isEnabled: boolean;
    time?: Date;
    frequency?: string;
  };
}
