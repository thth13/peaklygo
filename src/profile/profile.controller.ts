import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ProfileService } from './profile.service';
import { EditProfileDto } from './dto/edit-profile-dto';
import { CheckAccessGuard } from 'src/auth/guards/checkAccess.guard';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Put(':userId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CheckAccessGuard)
  @UseInterceptors(
    FileInterceptor('avatar', {
      limits: {
        fileSize: 20 * 1024 * 1024, // 20MB in bytes
      },
      fileFilter: (_, file, cb) => {
        if (file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
          cb(null, true);
        } else {
          cb(new Error('Unsupported file type'), false);
        }
      },
    }),
  )
  async editProfile(
    @Request() req,
    @Body() editProfileDto: EditProfileDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return await this.profileService.editProfile(
      req.params.userId,
      editProfileDto,
      file,
    );
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getProfile(@Param() params) {
    return await this.profileService.getProfile(params.id);
  }

  @Get(':id/stats')
  @HttpCode(HttpStatus.OK)
  async getStats(@Param('id') id: string) {
    return await this.profileService.getStats(id);
  }
}
