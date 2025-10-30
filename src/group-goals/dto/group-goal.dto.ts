import {
  IsArray,
  IsBoolean,
  IsDate,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { DayOfWeek } from '../../goals/interfaces/goal.interface';

export class CreateGroupGoalDto {
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
  @IsNotEmpty()
  userId: string;

  @IsDate()
  @Transform(({ value }) => new Date(value))
  startDate: Date;

  @IsDate()
  @IsOptional()
  @Transform(({ value }) => (value ? new Date(value) : undefined))
  endDate?: Date;

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

export class SearchGroupUsersDto {
  @IsString()
  @IsNotEmpty()
  query: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  @Transform(({ value }) => {
    const parsed = typeof value === 'number' ? value : parseInt(value, 10);
    return Number.isNaN(parsed) ? 10 : parsed;
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
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  userIds: string[];

  @IsEnum(['owner', 'admin', 'member'])
  @IsOptional()
  role?: string = 'member';
}

export class RespondToInvitationDto {
  @IsEnum(['accepted', 'declined'])
  @IsNotEmpty()
  status: 'accepted' | 'declined';
}

export class UpdateGroupGoalDto {
  @IsString()
  @IsOptional()
  goalName?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDate()
  @IsOptional()
  @Transform(({ value }) => (value ? new Date(value) : undefined))
  startDate?: Date;

  @IsDate()
  @IsOptional()
  @Transform(({ value }) => (value ? new Date(value) : undefined))
  endDate?: Date;

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
        return undefined;
      }
    }
    return Array.isArray(value) ? value : undefined;
  })
  habitDaysOfWeek?: DayOfWeek[];

  @IsOptional()
  image?: string;

  @IsString()
  @IsOptional()
  consequence?: string;

  @IsString()
  @IsOptional()
  reward?: string;

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
