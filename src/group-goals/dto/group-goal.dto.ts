import {
  IsArray,
  IsBoolean,
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
import { CreateGoalDto } from '../../goals/dto/goal.dto';

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
  status: 'accepted' | 'declined';
}
