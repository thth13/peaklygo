import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDate,
  IsBoolean,
  IsNumber,
  IsEnum,
  IsObject,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateGoalDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDate()
  @Transform(({ value }) => new Date(value))
  targetDate: Date;

  @IsEnum(['daily', 'weekly', 'monthly', 'yearly'])
  frequency: string;

  @IsObject()
  @IsOptional()
  reminderSettings?: {
    isEnabled: boolean;
    time?: Date;
    frequency?: string;
  };
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

  @IsObject()
  @IsOptional()
  reminderSettings?: {
    isEnabled: boolean;
    time?: Date;
    frequency?: string;
  };
}
