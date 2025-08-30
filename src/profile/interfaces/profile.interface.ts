import { Document, Types } from 'mongoose';

export interface Profile extends Document {
  name: string;
  avatar: string;
  description: string;
  views: number;
  user: Types.ObjectId | { username: string };
  following: Types.ObjectId[];
  followers: Types.ObjectId[];
  rating: number;
}
