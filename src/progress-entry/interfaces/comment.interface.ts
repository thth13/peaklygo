import { Document, Types } from 'mongoose';

export interface Comment extends Document {
  progressEntryId: Types.ObjectId;
  userId: Types.ObjectId;
  content: string;
  likes: Types.ObjectId[];
  isEdited: boolean;
  createdAt: Date;
  updatedAt: Date;
}
