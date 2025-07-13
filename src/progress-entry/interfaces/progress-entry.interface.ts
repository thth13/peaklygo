import { Document, Types } from 'mongoose';

export interface ProgressEntry extends Document {
  goalId: Types.ObjectId;
  content: string;
  likes: Types.ObjectId[];
  isEdited: boolean;
  createdAt: Date;
  updatedAt: Date;
  day: number;
}
