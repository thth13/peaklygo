import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserStatsDocument = UserStats & Document;

@Schema({ timestamps: true })
export class UserStats {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  userId: Types.ObjectId;

  @Prop({ default: 0, min: 0 })
  goalsCreatedThisMonth: number;

  @Prop({ default: 0, min: 0 })
  activeGoalsNow: number;

  @Prop({ default: 0, min: 0 })
  completedGoals: number;

  @Prop({ default: 0, min: 0 })
  closedTasks: number;

  @Prop({ default: 0, min: 0 })
  blogPosts: number;

  @Prop({ default: 0 })
  lastMonthReset: Date;
}

export const UserStatsSchema = SchemaFactory.createForClass(UserStats);
