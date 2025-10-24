import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import validator from 'validator';
import mongoose, { HydratedDocument } from 'mongoose';

export type ForgotPasswordDocument = HydratedDocument<ForgotPassword>;

@Schema()
export class ForgotPassword {
  @Prop({ required: true })
  email: string;

  @Prop({ required: true, validate: validator.isUUID })
  verification: string;

  @Prop({ default: false })
  firstUsed: boolean;

  @Prop({ default: false })
  finalUsed: boolean;

  @Prop({ required: true })
  expires: Date;

  @Prop({ required: true })
  ip: string;

  @Prop({ required: true })
  browser: string;

  @Prop({ required: true })
  country: string;

  @Prop()
  ipChanged: string;

  @Prop()
  browserChanged: string;

  @Prop()
  countryChanged: string;
}

export const ForgotPasswordSchema =
  SchemaFactory.createForClass(ForgotPassword);
