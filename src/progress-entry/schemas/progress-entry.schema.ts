import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProgressEntryDocument = ProgressEntry & Document;

@Schema({ timestamps: true })
export class ProgressEntry {
  @Prop({ type: Types.ObjectId, ref: 'Goal', required: true })
  goalId: Types.ObjectId;

  @Prop({ required: true })
  content: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  likes: Types.ObjectId[];

  @Prop({ default: false })
  isEdited: boolean;
}

export const ProgressEntrySchema = SchemaFactory.createForClass(ProgressEntry);
