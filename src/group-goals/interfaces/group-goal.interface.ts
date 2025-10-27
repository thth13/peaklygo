import { Document, Types } from 'mongoose';
import { DayOfWeek } from '../../goals/interfaces/goal.interface';

export enum ParticipantRole {
  Owner = 'owner',
  Admin = 'admin',
  Member = 'member',
}

export enum InvitationStatus {
  Pending = 'pending',
  Accepted = 'accepted',
  Declined = 'declined',
}

export interface GroupSettings {
  allowMembersToInvite: boolean;
  requireApproval: boolean;
  maxParticipants: number;
}

export interface Participant {
  userId: Types.ObjectId;
  role: ParticipantRole;
  invitationStatus: InvitationStatus;
  joinedAt?: Date;
  contributionScore: number;
}

export interface CheckIn {
  userId: Types.ObjectId;
  date: Date;
  status: 'completed' | 'missed' | 'pending';
  createdAt: Date;
}

export interface GroupGoal extends Document {
  goalName: string;
  category: string;
  description?: string;
  startDate: Date;
  endDate?: Date;
  habitDuration?: number;
  habitDaysOfWeek?: DayOfWeek[];
  image?: string;
  isCompleted: boolean;
  isArchived: boolean;
  userId: Types.ObjectId;
  participants: Participant[];
  checkIns: CheckIn[];
  groupSettings: GroupSettings;
  createdAt: Date;
  updatedAt: Date;
}
