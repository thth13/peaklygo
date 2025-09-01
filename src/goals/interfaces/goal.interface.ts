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

export enum ActivityType {
  ProgressEntry = 'progressEntry',
  MarkStep = 'markStep',
  UnmarkStep = 'unmarkStep',
  UpdatedDeadline = 'updatedDeadline',
  EditedGoal = 'editedGoal',
  CompletedGoal = 'completedGoal',
}

export interface Activity {
  activityType: ActivityType;
  date: Date;
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
  activity: Activity[];
  reward?: string;
  consequence?: string;
  privacy: PrivaciyStatus;
  isCompleted: boolean;
  isArchived: boolean;
  value: number;
  userId: Types.ObjectId;
  progress: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedGoalsResponse {
  goals: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}
