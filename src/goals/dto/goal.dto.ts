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
import { Transform, Type } from 'class-transformer';
import { User } from 'src/user/schemas/user.schema';

class Step {
  @IsString()
  @IsNotEmpty()
  stepName: string;

  @IsBoolean()
  @IsOptional()
  isCompleted?: boolean;

  @IsNumber()
  @IsOptional()
  progress?: number;
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
  @Transform(({ value }) => new Date(value))
  startDate: string;

  @IsString()
  @Transform(({ value }) => new Date(value))
  endDate: string;

  @IsBoolean()
  noDeadline?: boolean;

  @IsOptional()
  image?: string;

  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return JSON.parse(value);
    }
    return value;
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Step)
  @IsOptional()
  steps?: Step[];

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
  @IsOptional()
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

  @IsNotEmpty()
  userId: User;

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
