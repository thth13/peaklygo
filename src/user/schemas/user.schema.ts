import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import validator from 'validator';
import mongoose, { HydratedDocument } from 'mongoose';
import * as bcrypt from 'bcrypt';

export type UserDocument = HydratedDocument<User>;

@Schema()
export class User {
  @Prop({
    required: true,
    lowercase: true,
    validate: validator.isEmail,
    minlength: 6,
    maxlength: 255,
    unique: true,
  })
  email: string;

  @Prop({
    required: true,
    lowercase: true,
    minlength: 3,
    maxlength: 30,
    unique: true,
    validate: {
      validator: function (v: string) {
        return /^[a-zA-Z0-9_]+$/.test(v);
      },
      message: 'Username can only contain letters, numbers and underscores',
    },
  })
  username: string;

  @Prop({ required: true, minlength: 4, maxlength: 1024 })
  password: string;

  @Prop({ default: 0 })
  loginAttempts: number;

  @Prop({ default: Date.now })
  blockExpires: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.pre('save', async function (next: (err?: Error) => void) {
  try {
    if (!this.isModified('password')) {
      return next();
    }

    // tslint:disable-next-line:no-string-literal
    const hashed = await bcrypt.hash(this['password'], 10);
    // tslint:disable-next-line:no-string-literal
    this['password'] = hashed;

    return next();
  } catch (err) {
    return next(err);
  }
});
