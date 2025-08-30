import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    example: 'mymail@gmail.com',
    description: 'The email of the User',
    format: 'email',
    uniqueItems: true,
    minLength: 5,
    maxLength: 255,
  })
  @IsString()
  @MinLength(5)
  @MaxLength(255)
  @IsEmail()
  readonly email: string;

  @ApiProperty({
    example: 'john_doe123',
    description: 'The username of the User',
    format: 'string',
    uniqueItems: true,
    minLength: 3,
    maxLength: 30,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Username can only contain letters, numbers and underscores',
  })
  readonly username: string;

  @ApiProperty({
    example: 'your password',
    description: 'The password of the User',
    format: 'string',
    minLength: 4,
    maxLength: 1024,
  })
  @ApiProperty()
  @IsString()
  @MinLength(4)
  @MaxLength(1024)
  readonly password: string;
}
