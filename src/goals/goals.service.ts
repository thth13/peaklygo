import { Injectable, NotFoundException } from '@nestjs/common';
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
} from './dto/goal.dto';
import {
  ActivityType,
  PaginatedGoalsResponse,
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
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const query = { userId: new Types.ObjectId(userId) };

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

    const updatedGoal = await this.goalModel
      .findOneAndUpdate(
        {
          _id: goalId,
          userId,
        },
        {
          $set: { ...updateGoalDto, userId },
          $push: {
            activity: {
              activityType: ActivityType.EditedGoal,
              date: new Date(),
            },
          },
        },
        { new: true },
      )
      .exec();

    if (!updatedGoal) {
      throw new NotFoundException('Goal not found');
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
    if (!goalToDelete.isCompleted) {
      await this.profileService.decrementActiveGoals(userObjectId);
    }
  }

  async completeGoal(goalId: string): Promise<Goal> {
    const goal = await this.goalModel
      .findOneAndUpdate({ _id: goalId }, { isCompleted: true }, { new: true })
      .exec();

    if (!goal) {
      throw new NotFoundException('Goal not found');
    }

    // Инкремент статистик
    await Promise.all([
      this.profileService.decrementActiveGoals(goal.userId),
      this.profileService.incrementCompletedGoals(goal.userId),
    ]);

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

    // Пересчитываем прогресс на основе выполненных шагов
    const totalSteps = goal.steps.length;
    const completedSteps = goal.steps.filter((step) => step.isCompleted).length;
    const newProgress =
      totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

    // Обновляем прогресс в цели
    const updatedGoal = await this.goalModel
      .findByIdAndUpdate(goalId, { progress: newProgress }, { new: true })
      .exec();

    // Инкремент/декремент статистик задач
    if (isCompleted) {
      await this.profileService.incrementClosedTasks(goal.userId);
    } else {
      await this.profileService.decrementClosedTasks(goal.userId);
    }

    return updatedGoal;
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
    return goal.save();
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
    return goal.save();
  }
}
