import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, Types } from 'mongoose';
import {
  NotificationMetadata,
  NotificationType,
} from '../interfaces/notification.interface';

export type NotificationDocument = HydratedDocument<Notification>;

@Schema({ timestamps: true })
export class Notification {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(NotificationType),
    required: true,
  })
  type: NotificationType;

  @Prop({ required: true, maxlength: 255 })
  title: string;

  @Prop({ required: true, maxlength: 1024 })
  message: string;

  @Prop({ type: mongoose.Schema.Types.Mixed })
  metadata?: NotificationMetadata;

  @Prop({ default: false })
  read: boolean;

  @Prop()
  readAt?: Date;
}

export const NotificationSchema =
  SchemaFactory.createForClass(Notification);
