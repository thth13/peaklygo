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

  @Prop({ required: true })
  endDate: Date;

  @Prop()
  image: string;

  @Prop([String])
  steps: string[];

  @Prop({ 
    type: String, 
    enum: ['checklist', 'days', 'numeric'], 
    required: true 
  })
  trackingType: string;

  @Prop()
  target: string;

  @Prop({
    type: {
      daily: Boolean,
      weekly: Boolean,
      beforeDeadline: Boolean
    }
  })
  reminders: {
    daily: boolean;
    weekly: boolean;
    beforeDeadline: boolean;
  };

  @Prop([String])
  rewards: string[];

  @Prop({ 
    type: String, 
    enum: ['private', 'friends', 'public'], 
    default: 'private' 
  })
  privacy: string;

  @Prop([String])
  tags: string[];

  @Prop({
    type: {
      allowComments: Boolean,
      showInFeed: Boolean,
      autoPublishAchievements: Boolean
    },
    default: {
      allowComments: true,
      showInFeed: true,
      autoPublishAchievements: false
    }
  })
  publicationSettings: {
    allowComments: boolean;
    showInFeed: boolean;
    autoPublishAchievements: boolean;
  };

  @Prop({ default: false })
  isCompleted: boolean;

  @Prop()
  goalWorth: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: User;

  @Prop({ default: 0, min: 0, max: 100 })
  progress: number;
}

export const GoalSchema = SchemaFactory.createForClass(Goal);
