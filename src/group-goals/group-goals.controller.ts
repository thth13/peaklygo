import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
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

@Controller('goals')
export class GroupGoalsController {
  constructor(private readonly groupGoalsService: GroupGoalsService) {}

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

  @Put('group/:goalId/steps/:stepId/complete')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async markGroupStepCompleted(
    @Request() req,
    @Param('goalId') goalId: string,
    @Param('stepId') stepId: string,
    @Body('isCompleted') isCompleted: boolean,
  ) {
    return await this.groupGoalsService.markStepCompleted(
      goalId,
      stepId,
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
}
