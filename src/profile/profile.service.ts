import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Profile } from './schemas/profile.schema';
import { Model, Types } from 'mongoose';
import { EditProfileDto } from './dto/edit-profile-dto';
import * as sharp from 'sharp';
import { InjectS3, S3 } from 'nestjs-s3';
import { randomUUID } from 'crypto';
import { DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { Goal, GoalDocument } from 'src/goals/schemas/goal.schema';
import {
  ProgressEntry,
  ProgressEntryDocument,
} from 'src/progress-entry/schemas/progress-entry.schema';
import { ProfileStats } from './interfaces/profile-stats.interface';
import { UserStats, UserStatsDocument } from './schemas/user-stats.schema';
import { User, UserDocument } from 'src/user/schemas/user.schema';
import { UserService } from 'src/user/user.service';

@Injectable()
export class ProfileService {
  constructor(
    @InjectModel('Profile') private readonly profileModel: Model<Profile>,
    @InjectModel('User') private readonly userModel: Model<UserDocument>,
    @InjectModel(Goal.name) private readonly goalModel: Model<GoalDocument>,
    @InjectModel(ProgressEntry.name)
    private readonly progressEntryModel: Model<ProgressEntryDocument>,
    @InjectModel(UserStats.name)
    private readonly userStatsModel: Model<UserStatsDocument>,
    @InjectS3() private readonly s3: S3,
    private readonly userService: UserService,
  ) {}

  async editProfile(
    id: string,
    editProfileDto: EditProfileDto,
    avatar?: Express.Multer.File,
  ) {
    if (avatar) {
      editProfileDto.avatar = await this.compressAndUploadAvatar(avatar, id);
    }

    // Handle username update if provided
    if (editProfileDto.username) {
      await this.updateUsernameIfChanged(id, editProfileDto.username);
    }

    // Remove username from dto as it's not stored in Profile schema
    const { username, ...profileData } = editProfileDto;

    return await this.profileModel
      .findOneAndUpdate({ user: id }, profileData, { new: true })
      .populate('user', 'username')
      .exec();
  }

  async getProfile(id: string): Promise<Profile> {
    return this.findProfileByUser(id);
  }

  async addFollower() {}

  async getStats(userId: string): Promise<ProfileStats> {
    const userObjectId = new Types.ObjectId(userId);
    await this.ensureUserStatsExists(userObjectId);
    await this.checkAndResetMonthlyStats(userObjectId);

    const userStats = await this.userStatsModel
      .findOne({ userId: userObjectId })
      .exec();
    const profile = await this.findProfileByUser(userId);
    const rating = profile?.rating ?? 0;

    return {
      goalsCreatedThisMonth: userStats?.goalsCreatedThisMonth ?? 0,
      activeGoalsNow: userStats?.activeGoalsNow ?? 0,
      completedGoals: userStats?.completedGoals ?? 0,
      closedTasks: userStats?.closedTasks ?? 0,
      blogPosts: userStats?.blogPosts ?? 0,
      rating,
    };
  }

  async incrementGoalsCreatedThisMonth(userId: Types.ObjectId): Promise<void> {
    await this.ensureUserStatsExists(userId);
    await this.checkAndResetMonthlyStats(userId);
    await this.userStatsModel
      .findOneAndUpdate({ userId }, { $inc: { goalsCreatedThisMonth: 1 } })
      .exec();
  }

  async incrementActiveGoals(userId: Types.ObjectId): Promise<void> {
    await this.ensureUserStatsExists(userId);
    await this.userStatsModel
      .findOneAndUpdate({ userId }, { $inc: { activeGoalsNow: 1 } })
      .exec();
  }

  async decrementActiveGoals(userId: Types.ObjectId): Promise<void> {
    await this.ensureUserStatsExists(userId);
    await this.userStatsModel
      .findOneAndUpdate({ userId }, { $inc: { activeGoalsNow: -1 } })
      .exec();
  }

  async incrementCompletedGoals(userId: Types.ObjectId): Promise<void> {
    await this.ensureUserStatsExists(userId);
    await this.userStatsModel
      .findOneAndUpdate({ userId }, { $inc: { completedGoals: 1 } })
      .exec();
  }

  async incrementClosedTasks(userId: Types.ObjectId): Promise<void> {
    await this.ensureUserStatsExists(userId);
    await this.userStatsModel
      .findOneAndUpdate({ userId }, { $inc: { closedTasks: 1 } })
      .exec();
  }

  async decrementClosedTasks(userId: Types.ObjectId): Promise<void> {
    await this.ensureUserStatsExists(userId);
    await this.userStatsModel
      .findOneAndUpdate({ userId }, { $inc: { closedTasks: -1 } })
      .exec();
  }

  async incrementBlogPosts(
    userId: Types.ObjectId,
    amount: number = 1,
  ): Promise<void> {
    await this.ensureUserStatsExists(userId);
    await this.userStatsModel
      .findOneAndUpdate({ userId }, { $inc: { blogPosts: amount } })
      .exec();
  }

  private async ensureUserStatsExists(userId: Types.ObjectId): Promise<void> {
    const exists = await this.userStatsModel.findOne({ userId }).exec();
    if (!exists) {
      await this.userStatsModel.create({
        userId,
        goalsCreatedThisMonth: 0,
        activeGoalsNow: 0,
        completedGoals: 0,
        closedTasks: 0,
        blogPosts: 0,
        lastMonthReset: new Date(),
      });
    }
  }

  private async checkAndResetMonthlyStats(
    userId: Types.ObjectId,
  ): Promise<void> {
    const userStats = await this.userStatsModel.findOne({ userId }).exec();
    if (!userStats) return;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const lastResetMonth = userStats.lastMonthReset.getMonth();
    const lastResetYear = userStats.lastMonthReset.getFullYear();

    if (
      currentYear > lastResetYear ||
      (currentYear === lastResetYear && currentMonth > lastResetMonth)
    ) {
      await this.userStatsModel
        .findOneAndUpdate(
          { userId },
          {
            goalsCreatedThisMonth: 0,
            lastMonthReset: new Date(currentYear, currentMonth, 1),
          },
        )
        .exec();
    }
  }

  private async findProfileByUser(id: string): Promise<Profile> {
    try {
      // todo: check premium only if own profile
      await this.userService.checkAndUpdatePremiumStatus(id);

      return await this.profileModel
        .findOne({ user: id })
        .populate('user', 'username isPro tutorialCompleted proExpires')
        .exec();
    } catch (err) {
      throw new NotFoundException('Profile not found.');
    }
  }

  private async compressAndUploadAvatar(
    avatar: Express.Multer.File,
    userId: string,
  ) {
    const uniqueFileName = `${randomUUID()}`;
    const buffer = await sharp(avatar.buffer).webp({ quality: 30 }).toBuffer();

    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: uniqueFileName,
      Body: buffer,
      ContentType: avatar.mimetype,
    };

    try {
      await this.s3.send(new PutObjectCommand(params));

      const profile = await this.profileModel
        .findOne({ user: userId })
        .select('avatar');

      if (profile.avatar) {
        await this.s3.send(
          new DeleteObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: profile.avatar,
          }),
        );
      }
    } catch (err) {
      console.log(err);
    }

    return params.Key;
  }

  private async updateUsernameIfChanged(
    userId: string,
    newUsername: string,
  ): Promise<void> {
    const currentUser = await this.userModel.findById(userId);
    if (!currentUser) {
      throw new NotFoundException('User not found');
    }

    // If username hasn't changed, do nothing
    if (currentUser.username === newUsername.toLowerCase()) {
      return;
    }

    // Check if new username is unique
    const existingUser = await this.userModel.findOne({
      username: newUsername.toLowerCase(),
    });
    if (existingUser) {
      throw new BadRequestException({
        username: 'Username must be unique',
      });
    }

    // Update username
    await this.userModel.findByIdAndUpdate(userId, {
      username: newUsername.toLowerCase(),
    });
  }
}
