import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { UserId } from 'src/auth/decorators/user-id.decorator';
import { NotificationsService } from './notifications.service';
import { GetNotificationsDto } from './dto/get-notifications.dto';
import { MarkNotificationsDto } from './dto/mark-notifications.dto';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'List user notifications' })
  @ApiOkResponse({})
  async getNotifications(
    @UserId() userId: string,
    @Query() query: GetNotificationsDto,
  ) {
    return this.notificationsService.getUserNotifications(userId, query);
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Mark notification as read' })
  async markAsRead(
    @UserId() userId: string,
    @Param('id') notificationId: string,
  ) {
    await this.notificationsService.markAsRead(userId, notificationId);
  }

  @Patch('mark-read')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Mark multiple notifications as read' })
  async markManyAsRead(
    @UserId() userId: string,
    @Body() body: MarkNotificationsDto,
  ) {
    await this.notificationsService.markManyAsRead(
      userId,
      body.notificationIds,
    );
  }

  @Patch('mark-all-read')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(@UserId() userId: string) {
    await this.notificationsService.markAllAsRead(userId);
  }

  @Patch(':id/respond')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Mark notification as responded' })
  async markAsResponded(
    @UserId() userId: string,
    @Param('id') notificationId: string,
  ) {
    await this.notificationsService.markAsResponded(userId, notificationId);
  }
}
