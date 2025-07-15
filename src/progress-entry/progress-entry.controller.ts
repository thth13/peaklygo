import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  UseGuards,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ProgressEntryService } from './progress-entry.service';
import {
  CreateProgressEntryDto,
  UpdateProgressEntryDto,
} from './dto/progress-entry.dto';
import { CreateCommentDto, UpdateCommentDto } from './dto/comment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserId } from '../auth/decorators/user-id.decorator';

@Controller('progress-entries')
export class ProgressEntryController {
  constructor(private readonly progressEntryService: ProgressEntryService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  async create(
    @UserId() userId: string,
    @Body() createProgressEntryDto: CreateProgressEntryDto,
  ) {
    return this.progressEntryService.create(userId, createProgressEntryDto);
  }

  @Get('goal/:goalId')
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Param('goalId') goalId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.progressEntryService.findAll(goalId, page, limit);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async update(
    @UserId() userId: string,
    @Param('id') id: string,
    @Body() updateProgressEntryDto: UpdateProgressEntryDto,
  ) {
    return this.progressEntryService.update(userId, id, updateProgressEntryDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@UserId() userId: string, @Param('id') id: string) {
    return this.progressEntryService.remove(userId, id);
  }

  @Post(':id/like')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async toggleLike(@UserId() userId: string, @Param('id') id: string) {
    return this.progressEntryService.toggleLike(userId, id);
  }

  @Post(':id/comments')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  async createComment(
    @UserId() userId: string,
    @Param('id') progressEntryId: string,
    @Body() createCommentDto: CreateCommentDto,
  ) {
    return this.progressEntryService.createComment(
      userId,
      progressEntryId,
      createCommentDto,
    );
  }

  @Get(':id/comments')
  @HttpCode(HttpStatus.OK)
  async getComments(
    @Param('id') progressEntryId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.progressEntryService.getComments(progressEntryId, page, limit);
  }

  @Put('comments/:commentId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async updateComment(
    @UserId() userId: string,
    @Param('commentId') commentId: string,
    @Body() updateCommentDto: UpdateCommentDto,
  ) {
    return this.progressEntryService.updateComment(
      userId,
      commentId,
      updateCommentDto,
    );
  }

  @Delete('comments/:commentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteComment(
    @UserId() userId: string,
    @Param('commentId') commentId: string,
  ) {
    return this.progressEntryService.deleteComment(userId, commentId);
  }

  @Post('comments/:commentId/like')
  @HttpCode(HttpStatus.OK)
  async toggleCommentLike(
    @UserId() userId: string,
    @Param('commentId') commentId: string,
  ) {
    return this.progressEntryService.toggleCommentLike(userId, commentId);
  }
}
