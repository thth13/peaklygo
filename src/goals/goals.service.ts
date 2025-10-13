import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as sharp from 'sharp';
import { InjectS3, S3 } from 'nestjs-s3';
import { randomUUID } from 'crypto';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { Goal, GoalDocument } from './schemas/goal.schema';
import {
  CreateGoalDto,
  UpdateGoalDto,
  CreateStepDto,
  GetGoalsPaginationDto,
  GoalFilterType,
} from './dto/goal.dto';
import {
  ActivityType,
  PaginatedGoalsResponse,
  LandingGoal,
} from './interfaces/goal.interface';
import { ProfileService } from 'src/profile/profile.service';

@Injectable()
export class GoalsService {
  constructor(
    @InjectModel(Goal.name) private goalModel: Model<GoalDocument>,
    @InjectS3() private readonly s3: S3,
    private readonly profileService: ProfileService,
  ) {}

  async create(
    createGoalDto: CreateGoalDto,
    image?: Express.Multer.File,
  ): Promise<Goal> {
    if (image) {
      createGoalDto.image = await this.compressAndUploadImage(image);
    }

    const userObjectId = new Types.ObjectId(createGoalDto.userId);
    const createdGoal = new this.goalModel({
      ...createGoalDto,
      userId: userObjectId,
    });

    const savedGoal = await createdGoal.save();

    // Инкремент статистик
    await Promise.all([
      this.profileService.incrementGoalsCreatedThisMonth(userObjectId),
      this.profileService.incrementActiveGoals(userObjectId),
    ]);

    return savedGoal;
  }

  async getUserGoals(
    userId: string,
    paginationDto: GetGoalsPaginationDto,
  ): Promise<PaginatedGoalsResponse> {
    const {
      page = 1,
      limit = 10,
      filter = GoalFilterType.ACTIVE,
    } = paginationDto;
    const skip = (page - 1) * limit;

    let query: any = {
      userId: new Types.ObjectId(userId),
    };

    switch (filter) {
      case GoalFilterType.COMPLETED:
        query.isCompleted = true;
        break;
      case GoalFilterType.ARCHIVED:
        query.isArchived = true;
        break;
      case GoalFilterType.ACTIVE:
      default:
        query.isCompleted = { $ne: true };
        query.$or = [{ isArchived: false }, { isArchived: { $exists: false } }];
        break;
    }

    const [goals, total] = await Promise.all([
      this.goalModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.goalModel.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      goals: goals as any[],
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };
  }

  async getArchivedGoals(
    userId: string,
    paginationDto: GetGoalsPaginationDto,
  ): Promise<PaginatedGoalsResponse> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const query = {
      userId: new Types.ObjectId(userId),
      isArchived: true,
    };

    const [goals, total] = await Promise.all([
      this.goalModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.goalModel.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      goals: goals as any[],
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };
  }

  async findOne(goalId: string): Promise<Goal> {
    const goal = await this.goalModel.findOne({ _id: goalId }).exec();

    if (!goal) {
      throw new NotFoundException('Goal not found');
    }

    return goal;
  }

  async update(
    goalId: string,
    updateGoalDto: UpdateGoalDto,
    image?: Express.Multer.File,
  ): Promise<Goal> {
    const userId = new Types.ObjectId(updateGoalDto.userId);

    if (image) {
      updateGoalDto.image = await this.compressAndUploadImage(image);
    }

    const stepsUpdated = updateGoalDto.steps !== undefined;

    const updatedGoal = await this.goalModel
      .findOneAndUpdate(
        {
          _id: goalId,
          userId,
        },
        {
          $set: { ...updateGoalDto, userId },
        },
        { new: true },
      )
      .exec();

    if (!updatedGoal) {
      throw new NotFoundException('Goal not found');
    }

    if (stepsUpdated) {
      await this.calculateAndUpdateProgress(goalId);
      return this.goalModel.findById(goalId).exec();
    }

    return updatedGoal;
  }

  async remove(userId: string, goalId: string): Promise<void> {
    const userObjectId = new Types.ObjectId(userId);

    const goalToDelete = await this.goalModel
      .findOne({ _id: goalId, userId: userObjectId })
      .exec();
    if (!goalToDelete) {
      throw new NotFoundException('Goal not found');
    }

    const result = await this.goalModel
      .deleteOne({ _id: goalId, userId: userObjectId })
      .exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException('Goal not found');
    }

    // Декремент статистик при удалении цели
    if (!goalToDelete.isCompleted && !goalToDelete.isArchived) {
      await this.profileService.decrementActiveGoals(userObjectId);
    }
  }

  async completeGoal(goalId: string): Promise<Goal> {
    const goal = await this.goalModel.findById(goalId).exec();

    if (!goal) {
      throw new NotFoundException('Goal not found');
    }

    if (goal.isCompleted) {
      throw new BadRequestException('Goal already completed');
    }

    const completionDate: Date = new Date();

    const updatedGoal = await this.goalModel
      .findOneAndUpdate(
        { _id: goalId },
        {
          isCompleted: true,
          completedDate: completionDate,
        },
        { new: true },
      )
      .exec();

    if (!updatedGoal) {
      throw new NotFoundException('Goal not found');
    }

    const ratingReward: number = updatedGoal.value ?? 0;
    await Promise.all([
      this.profileService.decrementActiveGoals(updatedGoal.userId),
      this.profileService.incrementCompletedGoals(updatedGoal.userId),
      this.profileService.incrementRating(updatedGoal.userId, ratingReward),
    ]);

    return updatedGoal;
  }

  async archiveGoal(goalId: string): Promise<Goal> {
    const goal = await this.goalModel
      .findOneAndUpdate({ _id: goalId }, { isArchived: true }, { new: true })
      .exec();

    if (!goal) {
      throw new NotFoundException('Goal not found');
    }

    // Декремент активных целей если цель не была завершена
    if (!goal.isCompleted) {
      await this.profileService.decrementActiveGoals(goal.userId);
    }

    return goal;
  }

  async unarchiveGoal(goalId: string): Promise<Goal> {
    const goal = await this.goalModel
      .findOneAndUpdate({ _id: goalId }, { isArchived: false }, { new: true })
      .exec();

    if (!goal) {
      throw new NotFoundException('Goal not found');
    }

    // Инкремент активных целей если цель не завершена
    if (!goal.isCompleted) {
      await this.profileService.incrementActiveGoals(goal.userId);
    }

    return goal;
  }

  async markStepCompleted(
    goalId: string,
    stepId: string,
    isCompleted: boolean,
  ): Promise<Goal> {
    const goal = await this.goalModel
      .findOneAndUpdate(
        {
          _id: goalId,
          'steps.id': stepId,
        },
        {
          $set: { 'steps.$.isCompleted': isCompleted },
          $push: {
            activity: {
              activityType: isCompleted
                ? ActivityType.MarkStep
                : ActivityType.UnmarkStep,
              date: new Date(),
            },
          },
        },
        { new: true },
      )
      .exec();

    if (!goal) {
      throw new NotFoundException('Goal or step not found');
    }

    await this.calculateAndUpdateProgress(goalId);

    const ratingChange = Math.floor(goal.value / 10);

    if (isCompleted) {
      await this.profileService.incrementClosedTasks(goal.userId);
      await this.profileService.incrementRating(goal.userId, ratingChange);
    } else {
      await this.profileService.decrementClosedTasks(goal.userId);
      await this.profileService.decrementRating(goal.userId, ratingChange);
    }

    return this.goalModel.findById(goalId).exec();
  }

  async createStep(
    goalId: string,
    createStepDto: CreateStepDto,
  ): Promise<Goal> {
    const goal = await this.goalModel.findById(goalId).exec();

    if (!goal) {
      throw new NotFoundException('Goal not found');
    }

    const newStep = {
      id: randomUUID(),
      text: createStepDto.text,
      isCompleted: false,
    };

    goal.steps.push(newStep);
    await goal.save();

    await this.calculateAndUpdateProgress(goalId);

    return this.goalModel.findById(goalId).exec();
  }

  async deleteStep(goalId: string, stepId: string): Promise<Goal> {
    const goal = await this.goalModel.findById(goalId).exec();

    if (!goal) {
      throw new NotFoundException('Goal not found');
    }

    const stepIndex = goal.steps.findIndex((step) => step.id === stepId);
    if (stepIndex === -1) {
      throw new NotFoundException('Step not found');
    }

    goal.steps.splice(stepIndex, 1);
    await goal.save();

    await this.calculateAndUpdateProgress(goalId);

    return this.goalModel.findById(goalId).exec();
  }

  async editStep(
    goalId: string,
    stepId: string,
    updateStepDto: { text: string },
  ): Promise<Goal> {
    const updatedGoal = await this.goalModel
      .findOneAndUpdate(
        {
          _id: goalId,
          'steps.id': stepId,
        },
        {
          $set: { 'steps.$.text': updateStepDto.text },
        },
        { new: true },
      )
      .exec();

    if (!updatedGoal) {
      throw new NotFoundException('Goal or step not found');
    }

    return updatedGoal;
  }

  async markHabitDay(
    goalId: string,
    date: Date,
    isCompleted: boolean,
  ): Promise<Goal> {
    const goal = await this.goalModel.findById(goalId).exec();

    if (!goal) {
      throw new NotFoundException('Goal not found');
    }

    const normalizedDate = new Date(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
    );

    // Ищем существующую запись для этой даты
    const existingDayIndex =
      goal.habitCompletedDays?.findIndex(
        (day) => day.date.toDateString() === normalizedDate.toDateString(),
      ) ?? -1;

    if (existingDayIndex >= 0) {
      // Обновляем существующую запись
      goal.habitCompletedDays[existingDayIndex].isCompleted = isCompleted;
    } else {
      // Создаем новую запись
      if (!goal.habitCompletedDays) {
        goal.habitCompletedDays = [];
      }
      goal.habitCompletedDays.push({
        date: normalizedDate,
        isCompleted,
      });
    }

    // Добавляем активность
    goal.activity.push({
      activityType: ActivityType.MarkHabitDay,
      date: new Date(),
    });

    const updatedGoal = await goal.save();

    // Обновляем статистики и рейтинг
    const ratingChange = Math.floor(goal.value / 10);

    if (isCompleted) {
      await this.profileService.incrementRating(goal.userId, ratingChange);
    } else if (existingDayIndex >= 0 && !isCompleted) {
      // Если день был отмечен как выполненный, но теперь отменяется
      await this.profileService.decrementRating(goal.userId, ratingChange);
    }

    return updatedGoal;
  }

  async getHabitStats(goalId: string): Promise<{
    totalDays: number;
    completedDays: number;
    successRate: number;
    currentStreak: number;
    longestStreak: number;
  }> {
    const goal = await this.goalModel.findById(goalId).exec();

    if (!goal) {
      throw new NotFoundException('Goal not found');
    }

    if (goal.goalType !== 'habit') {
      throw new BadRequestException(
        'This operation is only available for habit goals',
      );
    }

    const habitDays = goal.habitCompletedDays || [];
    const totalDays = habitDays.length;
    const completedDays = habitDays.filter((day) => day.isCompleted).length;
    const successRate = totalDays > 0 ? (completedDays / totalDays) * 100 : 0;

    // Подсчет текущей серии
    let currentStreak = 0;
    const sortedDays = habitDays.sort(
      (a, b) => b.date.getTime() - a.date.getTime(),
    );

    for (const day of sortedDays) {
      if (day.isCompleted) {
        currentStreak++;
      } else {
        break;
      }
    }

    // Подсчет самой длинной серии
    let longestStreak = 0;
    let tempStreak = 0;

    const sortedDaysAsc = habitDays.sort(
      (a, b) => a.date.getTime() - b.date.getTime(),
    );

    for (const day of sortedDaysAsc) {
      if (day.isCompleted) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    }

    return {
      totalDays,
      completedDays,
      successRate: Math.round(successRate * 100) / 100,
      currentStreak,
      longestStreak,
    };
  }

  async getLandingGoals(): Promise<LandingGoal[]> {
    const goals = await this.goalModel
      .find({ __v: 999 })
      .populate({
        path: 'userId',
        select: 'username',
      })
      .sort({ createdAt: -1 })
      .exec();

    // Fetch profiles separately
    const userIds = goals.map((goal) => (goal.userId as any)._id);
    const profiles = await this.profileService.getProfilesByUserIds(userIds);

    // Create profile map by userId
    const profileMap = new Map();
    profiles.forEach((profile) => {
      profileMap.set(profile.user.toString(), profile);
    });

    // Attach profiles to goals
    const result = goals.map((goal) => {
      const goalObj = goal.toObject();
      const profile = profileMap.get((goal.userId as any)._id.toString());

      return {
        ...goalObj,
        userId: {
          ...goalObj.userId,
          profile: profile
            ? {
                _id: profile._id,
                name: profile.name,
                avatar: profile.avatar,
              }
            : undefined,
        },
      };
    });

    return result as unknown as LandingGoal[];
  }

  private async calculateAndUpdateProgress(goalId: string): Promise<number> {
    const goal = await this.goalModel.findById(goalId).exec();

    if (!goal) {
      throw new NotFoundException('Goal not found');
    }

    const totalSteps = goal.steps.length;
    const completedSteps = goal.steps.filter((step) => step.isCompleted).length;
    const newProgress =
      totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

    await this.goalModel
      .findByIdAndUpdate(goalId, { progress: newProgress })
      .exec();

    return newProgress;
  }

  private async compressAndUploadImage(image: Express.Multer.File) {
    const uniqueFileName = `${randomUUID()}`;

    const buffer = await sharp(image.buffer).webp({ quality: 50 }).toBuffer();

    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: uniqueFileName,
      Body: buffer,
      ContentType: image.mimetype,
    };

    try {
      await this.s3.send(new PutObjectCommand(params));
    } catch (err) {
      console.log(err);
    }

    return params.Key;
  }
}
