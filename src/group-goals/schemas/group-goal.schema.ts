import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  DayOfWeek,
  GoalType,
  PrivaciyStatus,
} from '../../goals/interfaces/goal.interface';
import { Activity, Step } from '../../goals/schemas/goal.schema';
import {
  InvitationStatus,
  ParticipantRole,
} from '../interfaces/group-goal.interface';

export type GroupGoalDocument = GroupGoal & Document;

@Schema({ _id: false })
export class GroupSettings {
  @Prop({ default: false })
  allowMembersToInvite: boolean;

  @Prop({ default: true })
  requireApproval: boolean;

  @Prop({ default: 10 })
  maxParticipants: number;
}
export const GroupSettingsSchema = SchemaFactory.createForClass(GroupSettings);

@Schema({ _id: false })
export class Participant {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(ParticipantRole),
    required: true,
  })
  role: ParticipantRole;

  @Prop({
    type: String,
    enum: Object.values(InvitationStatus),
    default: InvitationStatus.Pending,
  })
  invitationStatus: InvitationStatus;

  @Prop()
  joinedAt?: Date;

  @Prop({ default: 0 })
  contributionScore: number;
}
export const ParticipantSchema = SchemaFactory.createForClass(Participant);

@Schema({ timestamps: true, collection: 'goals' })
export class GroupGoal {
  @Prop({ required: true })
  goalName: string;

  @Prop({ required: true })
  category: string;

  @Prop()
  description?: string;

  @Prop({
    type: String,
    enum: Object.values(GoalType),
    default: GoalType.Regular,
  })
  goalType: GoalType;

  @Prop({ required: true })
  startDate: Date;

  @Prop()
  endDate?: Date;

  @Prop()
  completedDate?: Date;

  @Prop()
  habitDuration?: number;

  @Prop({ type: [String], enum: Object.values(DayOfWeek) })
  habitDaysOfWeek?: DayOfWeek[];

  @Prop({ type: [Object], default: [] })
  habitCompletedDays?: any[];

  @Prop()
  image?: string;

  @Prop({ type: [Object], default: [] })
  steps: Step[];

  @Prop()
  reward?: string;

  @Prop()
  consequence?: string;

  @Prop({
    type: String,
    enum: Object.values(PrivaciyStatus),
    default: PrivaciyStatus.Private,
  })
  privacy: PrivaciyStatus;

  @Prop({ default: false })
  isCompleted: boolean;

  @Prop({ default: false })
  isArchived: boolean;

  @Prop({ default: 100, min: 1, max: 500 })
  value: number;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ default: 0, min: 0, max: 100 })
  progress: number;

  @Prop({ type: [Object], default: [] })
  activity: Activity[];

  @Prop({ default: true })
  isGroup: boolean;

  @Prop({ type: [ParticipantSchema], default: [] })
  participants: Participant[];

  @Prop({
    type: GroupSettingsSchema,
    default: {
      allowMembersToInvite: false,
      requireApproval: true,
      maxParticipants: 10,
    },
  })
  groupSettings: GroupSettings;

  @Prop({ type: [Object], default: [] })
  checkIns: Array<{
    userId: Types.ObjectId;
    date: Date;
    status: 'completed' | 'missed' | 'pending';
    createdAt: Date;
  }>;
}

export const GroupGoalSchema = SchemaFactory.createForClass(GroupGoal);
