import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ProgressEntry,
  ProgressEntryDocument,
} from './schemas/progress-entry.schema';
import { Comment, CommentDocument } from './schemas/comment.schema';
import {
  CreateProgressEntryDto,
  UpdateProgressEntryDto,
} from './dto/progress-entry.dto';
import { CreateCommentDto, UpdateCommentDto } from './dto/comment.dto';
import { Goal, GoalDocument } from '../goals/schemas/goal.schema';

@Injectable()
export class ProgressEntryService {
  constructor(
    @InjectModel(ProgressEntry.name)
    private progressEntryModel: Model<ProgressEntryDocument>,
    @InjectModel(Comment.name)
    private commentModel: Model<CommentDocument>,
    @InjectModel(Goal.name)
    private goalModel: Model<GoalDocument>,
  ) {}

  async create(
    userId: string,
    createProgressEntryDto: CreateProgressEntryDto,
  ): Promise<ProgressEntry> {
    // Проверяем, что пользователь - владелец цели
    const goal = await this.goalModel
      .findOne({
        _id: createProgressEntryDto.goalId,
        userId: new Types.ObjectId(userId),
      })
      .exec();

    if (!goal) {
      throw new NotFoundException('Goal not found or access denied');
    }

    const dayOfGoal = this.calculateDayOfGoal(goal.startDate, new Date());

    const progressEntry = new this.progressEntryModel({
      content: createProgressEntryDto.content,
      goalId: new Types.ObjectId(createProgressEntryDto.goalId),
      day: dayOfGoal,
    });

    return progressEntry.save();
  }

  async findAll(
    goalId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<any[]> {
    const entries = await this.progressEntryModel
      .find({ goalId: new Types.ObjectId(goalId) })
      .populate('likes', 'username')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();

    const entriesWithCommentCount = await Promise.all(
      entries.map(async (entry) => {
        const commentCount = await this.commentModel
          .countDocuments({ progressEntryId: entry._id })
          .exec();

        return {
          ...entry.toObject(),
          commentCount,
          likesCount: entry.likes.length,
        };
      }),
    );

    return entriesWithCommentCount;
  }

  async update(
    userId: string,
    entryId: string,
    updateProgressEntryDto: UpdateProgressEntryDto,
  ): Promise<ProgressEntry> {
    // Нужно проверить права через Goal
    const entry = await this.progressEntryModel
      .findById(entryId)
      .populate<{ goalId: Goal }>('goalId')
      .exec();

    if (!entry || entry.goalId.userId.toString() !== userId) {
      throw new NotFoundException('Progress entry not found or access denied');
    }

    const updatedEntry = await this.progressEntryModel
      .findOneAndUpdate(
        { _id: entryId },
        { ...updateProgressEntryDto, isEdited: true },
        { new: true },
      )
      .populate('likes', 'username')
      .exec();

    if (!updatedEntry) {
      throw new NotFoundException('Progress entry not found');
    }

    return updatedEntry;
  }

  async remove(userId: string, entryId: string): Promise<void> {
    const result = await this.progressEntryModel
      .deleteOne({ _id: entryId, userId: new Types.ObjectId(userId) })
      .exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException('Progress entry not found');
    }

    // Удаляем связанные комментарии
    await this.commentModel
      .deleteMany({ progressEntryId: new Types.ObjectId(entryId) })
      .exec();
  }

  async toggleLike(userId: string, entryId: string): Promise<ProgressEntry> {
    const userObjectId = new Types.ObjectId(userId);

    const entry = await this.progressEntryModel.findById(entryId).exec();
    if (!entry) {
      throw new NotFoundException('Progress entry not found');
    }

    const hasLiked = entry.likes.some((id) => id.equals(userObjectId));

    const updatedEntry = await this.progressEntryModel
      .findByIdAndUpdate(
        entryId,
        hasLiked
          ? { $pull: { likes: userObjectId } }
          : { $addToSet: { likes: userObjectId } },
        { new: true },
      )
      .populate('likes', 'username')
      .exec();

    return updatedEntry;
  }

  async createComment(
    userId: string,
    progressEntryId: string,
    createCommentDto: CreateCommentDto,
  ): Promise<Comment> {
    const progressEntry = await this.progressEntryModel
      .findById(progressEntryId)
      .exec();
    if (!progressEntry) {
      throw new NotFoundException('Progress entry not found');
    }

    const comment = new this.commentModel({
      ...createCommentDto,
      progressEntryId: new Types.ObjectId(progressEntryId),
      userId: new Types.ObjectId(userId),
    });

    return comment.save();
  }

  async getComments(
    progressEntryId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<Comment[]> {
    return this.commentModel
      .find({ progressEntryId: new Types.ObjectId(progressEntryId) })
      .populate('userId', 'username')
      .populate('likes', 'username')
      .sort({ createdAt: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();
  }

  async updateComment(
    userId: string,
    commentId: string,
    updateCommentDto: UpdateCommentDto,
  ): Promise<Comment> {
    const updatedComment = await this.commentModel
      .findOneAndUpdate(
        { _id: commentId, userId: new Types.ObjectId(userId) },
        { ...updateCommentDto, isEdited: true },
        { new: true },
      )
      .populate('userId', 'username')
      .populate('likes', 'username')
      .exec();

    if (!updatedComment) {
      throw new NotFoundException('Comment not found');
    }

    return updatedComment;
  }

  async deleteComment(userId: string, commentId: string): Promise<void> {
    const result = await this.commentModel
      .deleteOne({ _id: commentId, userId: new Types.ObjectId(userId) })
      .exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException('Comment not found');
    }
  }

  async toggleCommentLike(userId: string, commentId: string): Promise<Comment> {
    const userObjectId = new Types.ObjectId(userId);

    const comment = await this.commentModel.findById(commentId).exec();
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    const hasLiked = comment.likes.some((id) => id.equals(userObjectId));

    const updatedComment = await this.commentModel
      .findByIdAndUpdate(
        commentId,
        hasLiked
          ? { $pull: { likes: userObjectId } }
          : { $addToSet: { likes: userObjectId } },
        { new: true },
      )
      .populate('likes', 'username')
      .populate('userId', 'username') // Это оставляем - для Comment поле userId существует
      .exec();

    return updatedComment;
  }

  private calculateDayOfGoal(goalStartDate: Date, currentDate: Date): number {
    const diffTime = currentDate.getTime() - goalStartDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(1, diffDays + 1);
  }
}
