import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { GetNotificationsDto } from './dto/get-notifications.dto';
import { Notification } from './interfaces/notification.interface';
import { Notification as NotificationEntity } from './schemas/notification.schema';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(NotificationEntity.name)
    private readonly notificationModel: Model<Notification>,
  ) {}

  async create(createDto: CreateNotificationDto): Promise<Notification> {
    const userObjectId = new Types.ObjectId(createDto.userId);

    const notification = new this.notificationModel({
      user: userObjectId,
      type: createDto.type,
      title: createDto.title,
      message: createDto.message,
      metadata: createDto.metadata,
    });

    return notification.save();
  }

  async createMany(createDtos: CreateNotificationDto[]): Promise<void> {
    if (!createDtos.length) {
      return;
    }

    const docs = createDtos.map((dto) => ({
      user: new Types.ObjectId(dto.userId),
      type: dto.type,
      title: dto.title,
      message: dto.message,
      metadata: dto.metadata,
    }));

    await this.notificationModel.insertMany(docs);
  }

  async getUserNotifications(
    userId: string,
    query: GetNotificationsDto,
  ): Promise<{
    items: Notification[];
    total: number;
    page: number;
    limit: number;
    hasNextPage: boolean;
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const filter: any = {
      user: new Types.ObjectId(userId),
    };

    if (query.unreadOnly === true) {
      filter.read = false;
    }

    if (query.type) {
      filter.type = query.type;
    }

    const [items, total] = await Promise.all([
      this.notificationModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.notificationModel.countDocuments(filter),
    ]);

    return {
      items,
      total,
      page,
      limit,
      hasNextPage: page * limit < total,
    };
  }

  async markAsRead(userId: string, notificationId: string): Promise<void> {
    const result = await this.notificationModel.updateOne(
      {
        _id: new Types.ObjectId(notificationId),
        user: new Types.ObjectId(userId),
        read: { $ne: true },
      },
      {
        $set: {
          read: true,
          readAt: new Date(),
        },
      },
    );

    if (result.matchedCount === 0) {
      throw new NotFoundException('Notification not found');
    }
  }

  async markManyAsRead(
    userId: string,
    notificationIds: string[],
  ): Promise<void> {
    const objectIds = notificationIds.map((id) => new Types.ObjectId(id));

    await this.notificationModel.updateMany(
      {
        _id: { $in: objectIds },
        user: new Types.ObjectId(userId),
        read: { $ne: true },
      },
      {
        $set: {
          read: true,
          readAt: new Date(),
        },
      },
    );
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationModel.updateMany(
      {
        user: new Types.ObjectId(userId),
        read: { $ne: true },
      },
      {
        $set: {
          read: true,
          readAt: new Date(),
        },
      },
    );
  }
}
