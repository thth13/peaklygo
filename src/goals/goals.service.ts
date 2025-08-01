import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as sharp from 'sharp';
import { InjectS3, S3 } from 'nestjs-s3';
import { randomUUID } from 'crypto';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { Goal, GoalDocument } from './schemas/goal.schema';
import { CreateGoalDto, UpdateGoalDto, CreateStepDto } from './dto/goal.dto';

@Injectable()
export class GoalsService {
  constructor(
    @InjectModel(Goal.name) private goalModel: Model<GoalDocument>,
    @InjectS3() private readonly s3: S3,
  ) {}

  async create(
    createGoalDto: CreateGoalDto,
    image?: Express.Multer.File,
  ): Promise<Goal> {
    if (image) {
      createGoalDto.image = await this.compressAndUploadImage(image);
    }

    const createdGoal = new this.goalModel({
      ...createGoalDto,
      userId: new Types.ObjectId(createGoalDto.userId),
    });

    return createdGoal.save();
  }

  async getUserGoals(userId: string): Promise<Goal[]> {
    return this.goalModel.find({ userId: new Types.ObjectId(userId) }).exec();
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
        { ...updateGoalDto, userId },
        { new: true },
      )
      .exec();

    if (!updatedGoal) {
      throw new NotFoundException('Goal not found');
    }
    return updatedGoal;
  }

  async remove(userId: string, goalId: string): Promise<void> {
    const result = await this.goalModel
      .deleteOne({ _id: goalId, userId })
      .exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException('Goal not found');
    }
  }

  async updateProgress(
    userId: string,
    goalId: string,
    progress: number,
  ): Promise<Goal> {
    const goal = await this.goalModel
      .findOneAndUpdate(
        { _id: goalId, userId },
        { progress: Math.min(Math.max(progress, 0), 100) },
        { new: true },
      )
      .exec();

    if (!goal) {
      throw new NotFoundException('Goal not found');
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
