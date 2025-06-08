import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from 'src/user/schemas/user.schema';

export type GoalDocument = Goal & Document;

@Schema({ timestamps: true })
export class Goal {
  @Prop({ required: true })
  title: string;

  @Prop()
  description: string;

  @Prop({ required: true })
  targetDate: Date;

  @Prop({ default: false })
  isCompleted: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: User;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Goal' }] })
  subGoals: Goal[];

  @Prop({ default: 0 })
  progress: number;

  @Prop({ required: true, enum: ['daily', 'weekly', 'monthly', 'yearly'] })
  frequency: string;

  @Prop({ type: Object })
  reminderSettings: {
    isEnabled: boolean;
    time?: Date;
    frequency?: string;
  };
}

export const GoalSchema = SchemaFactory.createForClass(Goal);
