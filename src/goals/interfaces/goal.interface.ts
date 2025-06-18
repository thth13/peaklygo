import { Document } from 'mongoose';
import { User } from 'src/user/schemas/user.schema';

enum PrivaciyStatus {
  Private = 'private',
  Friends = 'friends',
  Public = 'public',
}

export interface Step {
  id: string;
  text: string;
  isCompleted?: boolean;
}

export interface Goal extends Document {
  goalName: string;
  category: string;
  description?: string;
  startDate: Date;
  endDate?: Date;
  noDeadline?: boolean;
  image?: string;
  steps: Step[];
  reward?: string;
  consequence?: string;
  privacy: PrivaciyStatus;
  isCompleted: boolean;
  value: number;
  userId: User;
  progress: number;
  createdAt: Date;
  updatedAt: Date;
}
