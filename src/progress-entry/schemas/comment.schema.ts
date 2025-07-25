import { Prop, Schema, SchemaFactory, Virtual } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CommentDocument = Comment & Document;

@Schema({ timestamps: true })
export class Comment {
  @Prop({ type: Types.ObjectId, ref: 'ProgressEntry', required: true })
  progressEntryId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Profile', required: true })
  profile: Types.ObjectId;

  @Prop({ required: true })
  content: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Profile' }], default: [] })
  likes: Types.ObjectId[];

  @Prop({ default: false })
  isEdited: boolean;
}

export const CommentSchema = SchemaFactory.createForClass(Comment);
