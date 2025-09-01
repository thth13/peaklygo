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
  IsPositive,
} from 'class-validator';
import { plainToInstance, Transform, Type } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';

class StepDto {
  @IsString()
  id: string;

  @IsString()
  text: string;

  @IsBoolean()
  @IsOptional()
  isCompleted?: boolean = false;
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
  @IsOptional()
  @Transform(({ value }) => new Date(value))
  endDate?: Date;

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
  value: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  progress?: number = 0;
}

export class UpdateGoalDto extends PartialType(CreateGoalDto) {}

export class CreateStepDto {
  @IsString()
  @IsNotEmpty()
  text: string;
}

export class UpdateStepDto {
  @IsString()
  @IsNotEmpty()
  text: string;
}

export class GetGoalsPaginationDto {
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Transform(({ value }) => parseInt(value))
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Transform(({ value }) => parseInt(value))
  @Min(1)
  @Max(100)
  limit?: number = 10;
}
