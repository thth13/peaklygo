import { Document, Types } from 'mongoose';

export enum NotificationType {
  GroupInvite = 'group_invite',
  Subscription = 'subscription',
  Message = 'message',
}

export interface NotificationMetadata {
  goalId?: Types.ObjectId | string;
  inviterId?: Types.ObjectId | string;
  subscriptionType?: string;
  messageId?: Types.ObjectId | string;
  [key: string]: any;
}

export interface Notification extends Document {
  user: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: NotificationMetadata;
  read: boolean;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
