import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateProgressEntryDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsString()
  @IsNotEmpty()
  goalId: string;
}

export class UpdateProgressEntryDto {
  @IsString()
  @IsOptional()
  content?: string;
}
