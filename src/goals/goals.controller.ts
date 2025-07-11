import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { GoalsService } from './goals.service';
import { CreateGoalDto, UpdateGoalDto } from './dto/goal.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('goals')
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}
  @Post('')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('image', {
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
  @UseGuards(JwtAuthGuard)
  async create(
    @Body() createGoalDto: CreateGoalDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return await this.goalsService.create(createGoalDto, file);
  }

  @Get('/userGoals/:userId')
  @HttpCode(HttpStatus.OK)
  async getUserGoals(@Param('userId') userId: string) {
    return await this.goalsService.getUserGoals(userId);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) {
    return await this.goalsService.findOne(id);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateGoalDto: UpdateGoalDto,
  ) {
    return await this.goalsService.update(req.user.userId, id, updateGoalDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Request() req, @Param('id') id: string) {
    await this.goalsService.remove(req.user.userId, id);
  }

  @Put(':id/progress')
  @HttpCode(HttpStatus.OK)
  async updateProgress(
    @Request() req,
    @Param('id') id: string,
    @Body('progress') progress: number,
  ) {
    return await this.goalsService.updateProgress(
      req.user.userId,
      id,
      progress,
    );
  }

  @Put(':goalId/steps/:stepId/complete')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async markStepCompleted(
    @Request() req,
    @Param('goalId') goalId: string,
    @Param('stepId') stepId: string,
    @Body('isCompleted') isCompleted: boolean,
  ) {
    return await this.goalsService.markStepCompleted(
      goalId,
      stepId,
      isCompleted,
    );
  }
}
