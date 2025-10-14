import { Document, Types } from 'mongoose';

export enum PrivaciyStatus {
  Private = 'private',
  Friends = 'friends',
  Public = 'public',
}

export enum GoalType {
  Regular = 'regular',
  Habit = 'habit',
}

export enum DayOfWeek {
  Monday = 'monday',
  Tuesday = 'tuesday',
  Wednesday = 'wednesday',
  Thursday = 'thursday',
  Friday = 'friday',
  Saturday = 'saturday',
  Sunday = 'sunday',
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
  MarkHabitDay = 'markHabitDay',
  UnmarkHabitDay = 'unmarkHabitDay',
}

export interface Activity {
  activityType: ActivityType;
  date: Date;
}

export interface HabitDay {
  date: Date;
  isCompleted: boolean;
}

export interface Goal extends Document {
  goalName: string;
  category: string;
  description?: string;
  goalType: GoalType;
  startDate: Date;
  endDate?: Date;
  completedDate?: Date;
  noDeadline?: boolean;
  habitDuration?: number;
  habitDaysOfWeek?: DayOfWeek[];
  habitCompletedDays?: HabitDay[];
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

export interface LandingGoal {
  _id: Types.ObjectId;
  goalName: string;
  category: string;
  description?: string;
  goalType: GoalType;
  startDate: Date;
  endDate?: Date;
  completedDate?: Date;
  noDeadline?: boolean;
  habitDuration?: number;
  habitDaysOfWeek?: DayOfWeek[];
  habitCompletedDays?: HabitDay[];
  image?: string;
  steps: Step[];
  activity: Activity[];
  reward?: string;
  consequence?: string;
  privacy: PrivaciyStatus;
  isCompleted: boolean;
  isArchived: boolean;
  value: number;
  progress: number;
  createdAt: Date;
  updatedAt: Date;
  userId: {
    _id: Types.ObjectId;
    username: string;
    profile?: {
      _id: Types.ObjectId;
      name: string;
      avatar?: string;
    };
  };
}
