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
  firstUsed: Boolean;

  @Prop({ default: false })
  finalUsed: Boolean;

  @Prop({ required: true })
  expires: Date;

  @Prop({ required: true })
  ip: String;

  @Prop({ required: true })
  browser: String;

  @Prop({ required: true })
  country: String;

  @Prop()
  ipChanged: String;

  @Prop()
  browserChanged: String;

  @Prop()
  countryChanged: String;
}

export const ForgotPasswordSchema = SchemaFactory.createForClass(ForgotPassword);
