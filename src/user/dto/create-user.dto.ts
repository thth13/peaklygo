import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

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
