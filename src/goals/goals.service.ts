import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as sharp from 'sharp';
import { InjectS3, S3 } from 'nestjs-s3';
import { randomUUID } from 'crypto';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { Goal, GoalDocument } from './schemas/goal.schema';
import { CreateGoalDto, UpdateGoalDto } from './dto/goal.dto';

@Injectable()
export class GoalsService {
  constructor(
    @InjectModel(Goal.name) private goalModel: Model<GoalDocument>,
    @InjectS3() private readonly s3: S3,
  ) {}

  async create(
    userId: string,
    createGoalDto: CreateGoalDto,
    image?: Express.Multer.File,
  ): Promise<Goal> {
    if (image) {
      createGoalDto.image = await this.compressAndUploadImage(image);
    }

    const createdGoal = new this.goalModel({
      ...createGoalDto,
      userId,
    });

    return createdGoal.save();
  }

  async findAll(userId: string): Promise<Goal[]> {
    return this.goalModel.find({ userId }).exec();
  }

  async findOne(userId: string, goalId: string): Promise<Goal> {
    const goal = await this.goalModel.findOne({ _id: goalId, userId }).exec();
    if (!goal) {
      throw new NotFoundException('Goal not found');
    }
    return goal;
  }

  async update(
    userId: string,
    goalId: string,
    updateGoalDto: UpdateGoalDto,
  ): Promise<Goal> {
    const updatedGoal = await this.goalModel
      .findOneAndUpdate({ _id: goalId, userId }, updateGoalDto, { new: true })
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
