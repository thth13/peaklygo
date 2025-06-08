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
} from '@nestjs/common';
import { GoalsService } from './goals.service';
import { CreateGoalDto, UpdateGoalDto } from './dto/goal.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('goals')
@UseGuards(JwtAuthGuard)
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Request() req, @Body() createGoalDto: CreateGoalDto) {
    return await this.goalsService.create(req.user.userId, createGoalDto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(@Request() req) {
    return await this.goalsService.findAll(req.user.userId);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Request() req, @Param('id') id: string) {
    return await this.goalsService.findOne(req.user.userId, id);
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
}
