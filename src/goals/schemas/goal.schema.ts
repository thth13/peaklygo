import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  ActivityType,
  GoalType,
  DayOfWeek,
  PrivaciyStatus,
} from '../interfaces/goal.interface';

export type GoalDocument = Goal & Document;

@Schema({ timestamps: true })
export class Goal {
  @Prop({ required: true })
  goalName: string;

  @Prop({ required: true })
  category: string;

  @Prop()
  description: string;

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

  @Prop({
    type: [String],
    enum: Object.values(DayOfWeek),
  })
  habitDaysOfWeek?: DayOfWeek[];

  @Prop({ type: [Object], default: [] })
  habitCompletedDays?: any[];

  @Prop()
  image: string;

  @Prop({ type: [Object], default: [] })
  steps: Step[];

  @Prop()
  reward: string;

  @Prop()
  consequence: string;

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
}

export const GoalSchema = SchemaFactory.createForClass(Goal);

export class Step {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  text: string;

  @Prop({ default: false })
  isCompleted: boolean;
}
export const StepSchema = SchemaFactory.createForClass(Step);

export class Activity {
  @Prop({ required: true })
  activityType: ActivityType;

  @Prop({ required: true, default: Date.now })
  date: Date;
}
export const ActivitySchema = SchemaFactory.createForClass(Activity);

export class HabitDaySchema {
  @Prop({ required: true })
  date: Date;

  @Prop({ required: true, default: false })
  isCompleted: boolean;
}
export const HabitDaySchemaFactory =
  SchemaFactory.createForClass(HabitDaySchema);
