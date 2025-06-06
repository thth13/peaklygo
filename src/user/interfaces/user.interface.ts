import { Document, Types } from 'mongoose';

export interface User extends Document {
  email: string;
  password: string;
  loginAttempts?: number;
  blockExpires?: Date;
}

export interface UserLoginInfo {
  email: string;
  accessToken: string;
  refreshToken: string;
}
