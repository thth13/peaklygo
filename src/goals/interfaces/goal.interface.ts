import { Document, Types } from 'mongoose';

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
  userId: Types.ObjectId;
  progress: number;
  createdAt: Date;
  updatedAt: Date;
}
