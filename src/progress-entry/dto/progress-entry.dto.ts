import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateProgressEntryDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsString()
  @IsOptional()
  goalId?: string;

  @IsString()
  @IsOptional()
  groupGoalId?: string;
}

export class UpdateProgressEntryDto {
  @IsString()
  @IsOptional()
  content?: string;
}
