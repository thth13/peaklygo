import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, Types } from 'mongoose';

export type ProfileDocument = HydratedDocument<Profile>;

@Schema()
export class Profile {
  @Prop({ maxlength: 255 })
  name: string;

  @Prop()
  avatar: string;

  @Prop({ maxlength: 2048 })
  description: string;

  @Prop({ default: 0 })
  views: number;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  user: Types.ObjectId;

  @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }] })
  following: Types.ObjectId[];

  @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }] })
  followers: Types.ObjectId[];
}

export const ProfileSchema = SchemaFactory.createForClass(Profile);
