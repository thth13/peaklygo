import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProfileService } from './profile.service';
import { ProfileController } from './profile.controller';
import { Profile, ProfileSchema } from './schemas/profile.schema';
import { Goal, GoalSchema } from 'src/goals/schemas/goal.schema';
import {
  ProgressEntry,
  ProgressEntrySchema,
} from 'src/progress-entry/schemas/progress-entry.schema';
import { UserStats, UserStatsSchema } from './schemas/user-stats.schema';
import { User, UserSchema } from 'src/user/schemas/user.schema';
import { UserService } from 'src/user/user.service';
import { AuthService } from 'src/auth/auth.service';
import {
  ForgotPassword,
  ForgotPasswordSchema,
} from 'src/user/schemas/forgot-password.schema';
import {
  RefreshToken,
  RefreshTokenSchema,
} from 'src/auth/schemas/refresh-token-schema';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Profile.name, schema: ProfileSchema },
      { name: User.name, schema: UserSchema },
      { name: Goal.name, schema: GoalSchema },
      { name: ProgressEntry.name, schema: ProgressEntrySchema },
      { name: UserStats.name, schema: UserStatsSchema },
      { name: ForgotPassword.name, schema: ForgotPasswordSchema },
      { name: RefreshToken.name, schema: RefreshTokenSchema },
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '5 days' },
    }),
  ],
  controllers: [ProfileController],
  providers: [ProfileService, UserService, AuthService],
  exports: [ProfileService],
})
export class ProfileModule {}
