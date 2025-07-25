import { Document, Types } from 'mongoose';

export interface Comment extends Document {
  progressEntryId: Types.ObjectId;
  profileId: Types.ObjectId;
  content: string;
  likes: Types.ObjectId[];
  isEdited: boolean;
  createdAt: Date;
  updatedAt: Date;
}
