import { Document, Types } from 'mongoose';

export interface UserStats extends Document {
  userId: Types.ObjectId;
  goalsCreatedThisMonth: number;
  activeGoalsNow: number;
  completedGoals: number;
  closedTasks: number;
  blogPosts: number;
  lastMonthReset: Date;
}
