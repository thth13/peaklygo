import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from 'src/user/schemas/user.schema';

export type GoalDocument = Goal & Document;

@Schema({ timestamps: true })
export class Goal {
  @Prop({ required: true })
  goalName: string;

  @Prop({ required: true })
  category: string;

  @Prop()
  description: string;

  @Prop({ required: true })
  startDate: Date;

  @Prop()
  endDate: Date;

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
    enum: ['private', 'friends', 'public'],
    default: 'private',
  })
  privacy: string;

  @Prop({ default: false })
  isCompleted: boolean;

  @Prop({ default: 100, min: 1, max: 500 })
  value: number;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: User;

  @Prop({ default: 0, min: 0, max: 100 })
  progress: number;
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
