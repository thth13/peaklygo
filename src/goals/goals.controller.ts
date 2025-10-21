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
  Query,
} from '@nestjs/common';
import { GoalsService } from './goals.service';
import {
  CreateGoalDto,
  UpdateGoalDto,
  CreateStepDto,
  GetGoalsPaginationDto,
  UpdateStepDto,
  MarkHabitDayDto,
  CreateGroupGoalDto,
  AddParticipantDto,
  RespondToInvitationDto,
  SearchGroupUsersDto,
} from './dto/goal.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CheckAccessGuard } from '../auth/guards/checkAccess.guard';
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
        if (file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
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
  async getUserGoals(
    @Param('userId') userId: string,
    @Query() paginationDto: GetGoalsPaginationDto,
  ) {
    return await this.goalsService.getUserGoals(userId, paginationDto);
  }

  @Get('landing')
  @HttpCode(HttpStatus.OK)
  async getLandingGoals() {
    return await this.goalsService.getLandingGoals();
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) {
    return await this.goalsService.findOne(id);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('image', {
      limits: {
        fileSize: 20 * 1024 * 1024, // 20MB in bytes
      },
      fileFilter: (_, file, cb) => {
        if (file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          cb(null, true);
        } else {
          cb(new Error('Unsupported file type'), false);
        }
      },
    }),
  )
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() updateGoalDto: UpdateGoalDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return await this.goalsService.update(id, updateGoalDto, file);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  async remove(@Request() req, @Param('id') id: string) {
    return await this.goalsService.remove(req.user.id, id);
  }

  @Put(':id/completeGoal')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async completeGoal(@Param('id') id: string) {
    return await this.goalsService.completeGoal(id);
  }

  @Put(':id/archive')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async archiveGoal(@Param('id') id: string) {
    return await this.goalsService.archiveGoal(id);
  }

  @Put(':id/unarchive')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async unarchiveGoal(@Param('id') id: string) {
    return await this.goalsService.unarchiveGoal(id);
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
      req.user.id,
    );
  }

  @Post(':goalId/steps')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  async createStep(
    @Param('goalId') goalId: string,
    @Body() createStepDto: CreateStepDto,
  ) {
    return await this.goalsService.createStep(goalId, createStepDto);
  }

  @Delete(':goalId/steps/:stepId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async deleteStep(
    @Param('goalId') goalId: string,
    @Param('stepId') stepId: string,
  ) {
    return await this.goalsService.deleteStep(goalId, stepId);
  }

  @Put(':goalId/steps/:stepId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async editStep(
    @Param('goalId') goalId: string,
    @Param('stepId') stepId: string,
    @Body() updateStepDto: UpdateStepDto,
  ) {
    return await this.goalsService.editStep(goalId, stepId, updateStepDto);
  }

  @Put(':id/markHabitDay')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async markHabitDay(
    @Param('id') goalId: string,
    @Body() markHabitDayDto: MarkHabitDayDto,
  ) {
    return await this.goalsService.markHabitDay(
      goalId,
      markHabitDayDto.date,
      markHabitDayDto.isCompleted,
    );
  }

  @Get(':id/habitStats')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async getHabitStats(@Param('id') goalId: string) {
    return await this.goalsService.getHabitStats(goalId);
  }

  @Post('group')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('image', {
      limits: {
        fileSize: 20 * 1024 * 1024,
      },
      fileFilter: (_, file, cb) => {
        if (file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          cb(null, true);
        } else {
          cb(new Error('Unsupported file type'), false);
        }
      },
    }),
  )
  @UseGuards(JwtAuthGuard)
  async createGroupGoal(
    @Body() createGroupGoalDto: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const participantIds = createGroupGoalDto.participantIds || [];
    return await this.goalsService.createGroupGoal(
      createGroupGoalDto,
      participantIds,
      file,
    );
  }

  @Get('group/users/search')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async searchUsersForGroupInvite(
    @Request() req,
    @Query() queryDto: SearchGroupUsersDto,
  ) {
    return await this.goalsService.searchUsersForGroupInvite(
      req.user.id,
      queryDto,
    );
  }

  @Get('group/my')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async getMyGroupGoals(
    @Request() req,
    @Query() paginationDto: GetGoalsPaginationDto,
  ) {
    return await this.goalsService.getGroupGoals(req.user.id, paginationDto);
  }

  @Get('group/invitations')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async getGroupInvitations(@Request() req) {
    return await this.goalsService.getGroupInvitations(req.user.id);
  }

  @Post(':goalId/participants')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  async addParticipant(
    @Request() req,
    @Param('goalId') goalId: string,
    @Body() addParticipantDto: any,
  ) {
    return await this.goalsService.addParticipant(
      goalId,
      req.user.id,
      addParticipantDto.userId,
      addParticipantDto.role,
    );
  }

  @Put(':goalId/invitations/respond')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async respondToInvitation(
    @Request() req,
    @Param('goalId') goalId: string,
    @Body() respondDto: any,
  ) {
    return await this.goalsService.respondToInvitation(
      goalId,
      req.user.id,
      respondDto.status,
    );
  }

  @Delete(':goalId/participants/:participantId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async removeParticipant(
    @Request() req,
    @Param('goalId') goalId: string,
    @Param('participantId') participantId: string,
  ) {
    return await this.goalsService.removeParticipant(
      goalId,
      req.user.id,
      participantId,
    );
  }

  @Get(':goalId/group/stats')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async getGroupGoalStats(@Param('goalId') goalId: string) {
    return await this.goalsService.getGroupGoalStats(goalId);
  }
}
