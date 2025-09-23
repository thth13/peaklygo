import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PremiumGuard } from './guards/premium.guard';
import { User, UserSchema } from 'src/user/schemas/user.schema';
import { Profile, ProfileSchema } from 'src/profile/schemas/profile.schema';
import {
  ForgotPassword,
  ForgotPasswordSchema,
} from 'src/user/schemas/forgot-password.schema';
import {
  RefreshToken,
  RefreshTokenSchema,
} from './schemas/refresh-token-schema';
import { UserService } from 'src/user/user.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Profile.name, schema: ProfileSchema },
      { name: ForgotPassword.name, schema: ForgotPasswordSchema },
      { name: RefreshToken.name, schema: RefreshTokenSchema },
    ]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '5 days' },
    }),
  ],
  providers: [AuthService, JwtStrategy, PremiumGuard, UserService],
  exports: [AuthService, PremiumGuard],
})
export class AuthModule {}
