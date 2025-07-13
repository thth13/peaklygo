import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateCommentDto {
  @IsString()
  @IsNotEmpty()
  content: string;
}

export class UpdateCommentDto {
  @IsString()
  @IsOptional()
  content?: string;
}
