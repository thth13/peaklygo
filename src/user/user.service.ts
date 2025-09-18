import { Request } from 'express';
import axios from 'axios';
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { LoginUserDto } from './dto/login-user.dto';
import { InjectModel } from '@nestjs/mongoose';
import { addHours } from 'date-fns';
import * as bcrypt from 'bcrypt';
import { Model } from 'mongoose';
import { AuthService } from 'src/auth/auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { RefreshAccessTokenDto } from './dto/refresh-access-token';
import { CreateForgotPasswordDto } from './dto/create-forgot-password.dto';
import { ForgotPassword } from './interfaces/forgot-password.interface';
import { v4 } from 'uuid';
import { VerifyUuidDto } from './dto/verify-uuid.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Profile } from 'src/profile/interfaces/profile.interface';
import { User, UserLoginInfo } from './interfaces/user.interface';
import { randomUUID } from 'crypto';
import { InjectS3, S3 } from 'nestjs-s3';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { GoogleCodeResponse } from 'src/types';

@Injectable()
export class UserService {
  HOURS_TO_VERIFY = 4;
  LOGIN_ATTEMPTS_TO_BLOCK = 10;
  HOURS_TO_BLOCK = 6;

  constructor(
    @InjectModel('User') private readonly userModel: Model<User>,
    @InjectModel('Profile') private readonly profileModel: Model<Profile>,
    @InjectModel('ForgotPassword')
    private readonly forgotPasswordModel: Model<ForgotPassword>,
    private readonly authService: AuthService,
    @InjectS3() private readonly s3: S3,
  ) {}

  async create(
    req: Request,
    CreateUserDto: CreateUserDto,
  ): Promise<UserLoginInfo> {
    const user = new this.userModel(CreateUserDto);
    await this.isEmailUnique(user.email);
    await this.isUsernameUnique(user.username);
    const profile = new this.profileModel({ user: user.id });

    await profile.save();
    await user.save();

    return await this.buildLoginInfo(req, user);
  }

  async login(
    req: Request,
    loginUserDto: LoginUserDto,
  ): Promise<UserLoginInfo> {
    const user = await this.findUserByIdentifier(loginUserDto.identifier);
    await this.checkPassword(loginUserDto.password, user);
    await this.passwordsAreMatch(user);

    return await this.buildLoginInfo(req, user);
  }

  async googleLogin(
    req: Request,
    codeResponse: GoogleCodeResponse,
  ): Promise<UserLoginInfo> {
    const googlePayload = await this.authService.googleAuth(codeResponse);

    let user = await this.userModel.findOne({
      email: googlePayload.email,
    });

    if (!user) {
      // Generate unique username from email
      const baseUsername = googlePayload.email
        .split('@')[0]
        .replace(/[^a-zA-Z0-9_]/g, '_')
        .toLowerCase();
      let uniqueUsername = baseUsername;
      let counter = 1;

      // Ensure username is unique
      while (await this.userModel.findOne({ username: uniqueUsername })) {
        uniqueUsername = `${baseUsername}_${counter}`;
        counter++;
      }

      user = await this.userModel.create({
        email: googlePayload.email,
        username: uniqueUsername,
        password: v4(),
      });

      let profile = new this.profileModel({
        user: user.id,
        name: googlePayload.given_name,
      });

      if (googlePayload.picture) {
        profile.avatar = await this.downloadAndSaveGoogleAvatar(
          googlePayload.picture,
        );
      }

      await profile.save();
      await user.save();
    }

    return await this.buildLoginInfo(req, user);
  }

  async refreshAccessToken(refreshAccessTokenDto: RefreshAccessTokenDto) {
    const userId = await this.authService.findRefreshToken(
      refreshAccessTokenDto.refreshToken,
    );
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new BadRequestException({ refreshToken: 'USER_NOT_FOUND' });
    }

    return {
      accessToken: await this.authService.createAccessToken(user._id),
    };
  }

  async forgotPassword(
    req: Request,
    createForgotPasswordDto: CreateForgotPasswordDto,
  ) {
    await this.findByEmail(createForgotPasswordDto.email);
    await this.saveForgotPassword(req, createForgotPasswordDto);

    return {
      email: createForgotPasswordDto.email,
      message: 'verification sent',
    };
  }

  async forgotPasswordVerify(req: Request, verifyUuidDto: VerifyUuidDto) {
    const forgotPassword = await this.findForgotPasswordByUuid(verifyUuidDto);
    await this.setForgotPasswordFirstUser(req, forgotPassword);

    return {
      email: forgotPassword.email,
      message: 'Now reset your password',
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const forgotPassword =
      await this.findForgotPasswordByEmail(resetPasswordDto);
    await this.setForgotPasswordFinalUsed(forgotPassword);
    await this.resetUserPassword(resetPasswordDto);

    return {
      email: resetPasswordDto.email,
      message: 'password successfylly changed.',
    };
  }

  async updateBotId(userId: string, botId: string) {
    return this.userModel.findByIdAndUpdate(userId, { botId }, { new: true });
  }

  async findByBotId(botId: string) {
    return this.userModel.findOne({ botId });
  }

  // ********************************************
  // ╔═╗╦═╗╦╦  ╦╔═╗╔╦╗╔═╗  ╔╦╗╔═╗╔╦╗╦ ╦╔═╗╔╦╗╔═╗
  // ╠═╝╠╦╝║╚╗╔╝╠═╣ ║ ║╣   ║║║║╣  ║ ╠═╣║ ║ ║║╚═╗
  // ╩  ╩╚═╩ ╚╝ ╩ ╩ ╩ ╚═╝  ╩ ╩╚═╝ ╩ ╩ ╩╚═╝═╩╝╚═╝
  // ********************************************

  private async isEmailUnique(email: string) {
    const user = await this.userModel.findOne({ email });
    if (user) {
      throw new BadRequestException({ email: 'EMAIL_NOT_UNIQUE' });
    }
  }

  private async isUsernameUnique(username: string) {
    const user = await this.userModel.findOne({ username });
    if (user) {
      throw new BadRequestException({ username: 'USERNAME_NOT_UNIQUE' });
    }
  }

  private async buildLoginInfo(
    req: Request,
    user: User,
  ): Promise<UserLoginInfo> {
    const userLoginInfo = {
      id: user._id,
      email: user.email,
      username: user.username,
      accessToken: await this.authService.createAccessToken(user._id),
      refreshToken: await this.authService.createRefreshToken(req, user._id),
    };

    return userLoginInfo;
  }

  private async findUserByEmail(email: string): Promise<User> {
    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new UnauthorizedException({
        email: 'WRONG_CREDENTIALS',
        password: 'WRONG_CREDENTIALS',
      });
    }
    return user;
  }

  private isEmailFormat(identifier: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(identifier);
  }

  private async findUserByIdentifier(identifier: string): Promise<User> {
    const isEmail = this.isEmailFormat(identifier);
    const searchQuery = isEmail
      ? { email: identifier.toLowerCase() }
      : { username: identifier.toLowerCase() };

    const user = await this.userModel.findOne(searchQuery);
    if (!user) {
      throw new UnauthorizedException({
        identifier: 'WRONG_CREDENTIALS',
        password: 'WRONG_CREDENTIALS',
      });
    }
    return user;
  }

  private async findByEmail(email: string): Promise<User> {
    const user = await this.userModel.findOne({ email });

    if (!user) {
      throw new UnauthorizedException({ email: 'EMAIL_NOT_FOUND' });
    }

    return user;
  }

  private async checkPassword(attemptPass: string, user: User) {
    const match = await bcrypt.compare(attemptPass, user.password);

    if (!match) {
      throw new UnauthorizedException({
        identifier: 'WRONG_CREDENTIALS',
        password: 'WRONG_CREDENTIALS',
      });
    }

    return match;
  }

  private async downloadAndSaveGoogleAvatar(url: string) {
    const uniqueFileName = `${randomUUID()}`;
    try {
      const response = await axios.get(url, {
        decompress: false,
        responseType: 'arraybuffer',
      });

      const params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: uniqueFileName,
        Body: response.data,
        ContentType: response.headers['content-type'],
      };

      await this.s3.send(new PutObjectCommand(params));

      return uniqueFileName;
    } catch (err) {
      console.error('Error loading file:', err);
    }
  }

  // private async passwordsDoNotMatch(user: User) {
  //   user.loginAttempts += 1;
  //   await user.save();
  //   if (user.loginAttempts >= this.LOGIN_ATTEMPTS_TO_BLOCK) {
  //     await this.blockUser(user);
  //     throw new ConflictException('Too many attempts. User blocked.');
  //   }
  // }

  private async blockUser(user: User) {
    user.blockExpires = addHours(new Date(), this.HOURS_TO_BLOCK);
    await user.save();
  }

  private async passwordsAreMatch(user: User) {
    user.loginAttempts = 0;
    await user.save();
  }

  // TODO: send verify code to email
  private async saveForgotPassword(
    req: Request,
    createForgotPasswordDto: CreateForgotPasswordDto,
  ) {
    const forgotPassword = await this.forgotPasswordModel.create({
      email: createForgotPasswordDto.email,
      verification: v4(),
      expires: addHours(new Date(), this.HOURS_TO_VERIFY),
      ip: this.authService.getIp(req),
      browser: this.authService.getBrowserInfo(req),
      country: this.authService.getCountry(req),
    });

    await forgotPassword.save();
  }

  private async findForgotPasswordByUuid(
    verifyUuidDto: VerifyUuidDto,
  ): Promise<ForgotPassword> {
    const forgotPassword = await this.forgotPasswordModel.findOne({
      verification: verifyUuidDto.verification,
      firstUsed: false,
      finalUsed: false,
      expired: { $gt: new Date() },
    });
    if (!forgotPassword) {
      throw new BadRequestException({
        verification: 'INVALID_VERIFICATION_TOKEN',
      });
    }

    return forgotPassword;
  }

  private async setForgotPasswordFirstUser(
    req: Request,
    forgotPassword: ForgotPassword,
  ) {
    forgotPassword.firstUsed = true;
    forgotPassword.ipChanged = this.authService.getIp(req);
    forgotPassword.browserChanged = this.authService.getBrowserInfo(req);
    forgotPassword.countryChanged = this.authService.getCountry(req);

    await forgotPassword.save();
  }

  private async findForgotPasswordByEmail(
    resetPasswordDto: ResetPasswordDto,
  ): Promise<ForgotPassword> {
    const forgotPassword = await this.forgotPasswordModel.findOne({
      email: resetPasswordDto.email,
      firstUsed: true,
      finalUsed: false,
      expires: { $gt: new Date() },
    });

    if (!forgotPassword) {
      throw new BadRequestException({ email: 'INVALID_RESET_REQUEST' });
    }

    return forgotPassword;
  }

  private async setForgotPasswordFinalUsed(forgotPassword: ForgotPassword) {
    forgotPassword.finalUsed = true;
    await forgotPassword.save();
  }

  private async resetUserPassword(resetPasswordDto: ResetPasswordDto) {
    const user = await this.userModel.findOne({
      email: resetPasswordDto.email,
      verifed: true,
    });

    user.password = resetPasswordDto.password;
    await user.save();
  }

  // checkPassword
  // passwordAreMatch
}
