import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { User } from 'src/user/schemas/user.schema';

export type RefreshTokenDocument = HydratedDocument<RefreshToken>;

@Schema()
export class RefreshToken {
  @Prop({
    required: true,
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  })
  userId: User;

  @Prop({ required: true })
  refreshToken: string;

  @Prop({ required: true })
  ip: string;

  @Prop({ required: true })
  browser: string;

  @Prop({ required: true })
  country: string;
}

export const RefreshTokenSchema = SchemaFactory.createForClass(RefreshToken);
