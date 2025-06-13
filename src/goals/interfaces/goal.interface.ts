import { Document } from 'mongoose';
import { User } from 'src/user/schemas/user.schema';

export interface Goal extends Document {
  goalName: string;
  category: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  image?: string;
  steps?: string[];
  reward?: string;
  consequence?: string;
  privacy: 'private' | 'friends' | 'public';
  isCompleted: boolean;
  value: number;
  userId: User;
  progress: number;
  createdAt: Date;
  updatedAt: Date;
}