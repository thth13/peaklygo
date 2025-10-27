import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { UserId } from 'src/auth/decorators/user-id.decorator';
import { GroupGoalsService } from './group-goals.service';
import {
  AddParticipantDto,
  CreateGroupGoalDto,
  RespondToInvitationDto,
  SearchGroupUsersDto,
} from './dto/group-goal.dto';
import {
  CreateStepDto,
  GetGoalsPaginationDto,
  UpdateStepDto,
} from 'src/goals/dto/goal.dto';
import { ProgressEntryService } from 'src/progress-entry/progress-entry.service';
import {
  CreateProgressEntryDto,
  UpdateProgressEntryDto,
} from 'src/progress-entry/dto/progress-entry.dto';
import {
  CreateCommentDto,
  UpdateCommentDto,
} from 'src/progress-entry/dto/comment.dto';

@Controller('goals')
export class GroupGoalsController {
  constructor(
    private readonly groupGoalsService: GroupGoalsService,
    private readonly progressEntryService: ProgressEntryService,
  ) {}

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
    @Body() createGroupGoalDto: CreateGroupGoalDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const participantIds = createGroupGoalDto.participantIds || [];
    return await this.groupGoalsService.createGroupGoal(
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
    return await this.groupGoalsService.searchUsersForGroupInvite(
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
    return await this.groupGoalsService.getGroupGoals(
      req.user.id,
      paginationDto,
    );
  }

  @Get('group/invitations')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async getGroupInvitations(@Request() req) {
    return await this.groupGoalsService.getGroupInvitations(req.user.id);
  }

  @Get('group/:goalId')
  @HttpCode(HttpStatus.OK)
  async getGroupGoalById(@Param('goalId') goalId: string) {
    return await this.groupGoalsService.getGroupGoalById(goalId);
  }

  @Post(':goalId/participants')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  async addParticipant(
    @Request() req,
    @Param('goalId') goalId: string,
    @Body() addParticipantDto: AddParticipantDto,
  ) {
    return await this.groupGoalsService.addParticipant(
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
    @Body() respondDto: RespondToInvitationDto,
  ) {
    return await this.groupGoalsService.respondToInvitation(
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
    return await this.groupGoalsService.removeParticipant(
      goalId,
      req.user.id,
      participantId,
    );
  }

  @Get(':goalId/group/stats')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async getGroupGoalStats(@Param('goalId') goalId: string) {
    return await this.groupGoalsService.getGroupGoalStats(goalId);
  }

  @Patch('group/:goalId/check-in')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async markGroupCheckIn(
    @Request() req,
    @Param('goalId') goalId: string,
    @Body('date') date: Date,
    @Body('isCompleted') isCompleted: boolean,
  ) {
    return await this.groupGoalsService.markCheckIn(
      goalId,
      date,
      isCompleted,
      req.user.id,
    );
  }

  @Post('group/:goalId/steps')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  async createGroupStep(
    @Param('goalId') goalId: string,
    @Body() createStepDto: CreateStepDto,
  ) {
    return await this.groupGoalsService.createStep(goalId, createStepDto);
  }

  @Delete('group/:goalId/steps/:stepId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async deleteGroupStep(
    @Param('goalId') goalId: string,
    @Param('stepId') stepId: string,
  ) {
    return await this.groupGoalsService.deleteStep(goalId, stepId);
  }

  @Put('group/:goalId/steps/:stepId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async editGroupStep(
    @Param('goalId') goalId: string,
    @Param('stepId') stepId: string,
    @Body() updateStepDto: UpdateStepDto,
  ) {
    return await this.groupGoalsService.editStep(goalId, stepId, updateStepDto);
  }

  // Progress Entries для групповых целей
  @Post('group/:goalId/progress-entries')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  async createGroupProgressEntry(
    @UserId() userId: string,
    @Param('goalId') goalId: string,
    @Body() createProgressEntryDto: CreateProgressEntryDto,
  ) {
    return await this.progressEntryService.create(userId, {
      ...createProgressEntryDto,
      groupGoalId: goalId,
    });
  }

  @Get('group/:goalId/progress-entries')
  @HttpCode(HttpStatus.OK)
  async findAllGroupProgressEntries(
    @Param('goalId') goalId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return await this.progressEntryService.findAll(goalId, page, limit, true);
  }

  @Put('group/progress-entries/:id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async updateGroupProgressEntry(
    @UserId() userId: string,
    @Param('id') id: string,
    @Body() updateProgressEntryDto: UpdateProgressEntryDto,
  ) {
    return await this.progressEntryService.update(
      userId,
      id,
      updateProgressEntryDto,
    );
  }

  @Delete('group/progress-entries/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  async removeGroupProgressEntry(
    @UserId() userId: string,
    @Param('id') id: string,
  ) {
    return await this.progressEntryService.remove(userId, id);
  }

  @Post('group/progress-entries/:id/like')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async toggleGroupProgressEntryLike(
    @UserId() userId: string,
    @Param('id') id: string,
  ) {
    return await this.progressEntryService.toggleLike(userId, id);
  }

  @Post('group/progress-entries/:id/comments')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  async createGroupProgressEntryComment(
    @UserId() userId: string,
    @Param('id') progressEntryId: string,
    @Body() createCommentDto: CreateCommentDto,
  ) {
    return await this.progressEntryService.createComment(
      userId,
      progressEntryId,
      createCommentDto,
    );
  }

  @Get('group/progress-entries/:id/comments')
  @HttpCode(HttpStatus.OK)
  async getGroupProgressEntryComments(
    @Param('id') progressEntryId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return await this.progressEntryService.getComments(
      progressEntryId,
      page,
      limit,
    );
  }

  @Put('group/progress-entries/comments/:commentId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async updateGroupProgressEntryComment(
    @Param('commentId') commentId: string,
    @Body() updateCommentDto: UpdateCommentDto,
  ) {
    return await this.progressEntryService.updateComment(
      commentId,
      updateCommentDto,
    );
  }

  @Delete('group/progress-entries/comments/:commentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  async deleteGroupProgressEntryComment(
    @UserId() userId: string,
    @Param('commentId') commentId: string,
  ) {
    return await this.progressEntryService.deleteComment(userId, commentId);
  }

  @Post('group/progress-entries/comments/:commentId/like')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async toggleGroupProgressEntryCommentLike(
    @UserId() userId: string,
    @Param('commentId') commentId: string,
  ) {
    return await this.progressEntryService.toggleCommentLike(userId, commentId);
  }
}
