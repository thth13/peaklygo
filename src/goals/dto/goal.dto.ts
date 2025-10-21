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
  IsMongoId,
} from 'class-validator';
import { plainToInstance, Transform, Type } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';
import { GoalType, DayOfWeek } from '../interfaces/goal.interface';

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

  @IsEnum(GoalType)
  @IsOptional()
  goalType?: GoalType = GoalType.Regular;

  @IsString()
  userId: string;

  @IsDate()
  @Transform(({ value }) => new Date(value))
  startDate: Date;

  @IsDate()
  @IsOptional()
  @Transform(({ value }) => new Date(value))
  endDate?: Date;

  @IsDate()
  @IsOptional()
  @Transform(({ value }) => new Date(value))
  completedDate?: Date;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  noDeadline?: boolean;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Transform(({ value }) => (value ? parseInt(value) : undefined))
  habitDuration?: number;

  @IsArray()
  @IsEnum(DayOfWeek, { each: true })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return [];
      }
    }
    return Array.isArray(value) ? value : [];
  })
  habitDaysOfWeek?: DayOfWeek[];

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

export class MarkHabitDayDto {
  @IsDate()
  @Transform(({ value }) => new Date(value))
  date: Date;

  @IsBoolean()
  isCompleted: boolean;
}

export enum GoalFilterType {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  ARCHIVED = 'archived',
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

  @IsOptional()
  @IsEnum(GoalFilterType)
  filter?: GoalFilterType = GoalFilterType.ACTIVE;
}

export class SearchGroupUsersDto {
  @IsString()
  @IsNotEmpty()
  query: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  @Transform(({ value }) => {
    const parsed =
      typeof value === 'number' ? value : parseInt(value, 10);
    return isNaN(parsed) ? 10 : parsed;
  })
  limit?: number = 10;

  @IsOptional()
  @IsMongoId()
  goalId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (!value) {
      return [];
    }
    if (Array.isArray(value)) {
      return value.filter(Boolean);
    }
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }
    return [];
  })
  excludeUserIds?: string[] = [];
}

export class AddParticipantDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsEnum(['owner', 'admin', 'member'])
  @IsOptional()
  role?: string = 'member';
}

export class RespondToInvitationDto {
  @IsEnum(['accepted', 'declined'])
  @IsNotEmpty()
  status: string;
}

export class CreateGroupGoalDto extends CreateGoalDto {
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isGroup?: boolean = true;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return [];
      }
    }
    return Array.isArray(value) ? value : [];
  })
  participantIds?: string[];

  @IsObject()
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return undefined;
      }
    }
    return value;
  })
  groupSettings?: {
    allowMembersToInvite?: boolean;
    requireApproval?: boolean;
    maxParticipants?: number;
  };
}
