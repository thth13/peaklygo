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
  SearchGroupUsersDto,
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
      isGroup: false,
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
      $or: [{ isGroup: false }, { isGroup: { $exists: false } }],
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
        query.$and = [
          { $or: [{ isArchived: false }, { isArchived: { $exists: false } }] },
        ];
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
    userId?: string,
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

    // Для групповых целей обновляем вклад участника
    if (goal.isGroup && userId) {
      const participant = goal.participants?.find(
        (p) => p.userId.toString() === userId,
      );
      if (participant) {
        if (isCompleted) {
          participant.contributionScore += ratingChange;
        } else {
          participant.contributionScore = Math.max(
            0,
            participant.contributionScore - ratingChange,
          );
        }
        goal.markModified('participants');
        await goal.save();
      }
    }

    // Обновляем статистики для владельца или участника
    const targetUserId =
      goal.isGroup && userId ? new Types.ObjectId(userId) : goal.userId;

    if (isCompleted) {
      await this.profileService.incrementClosedTasks(targetUserId);
      await this.profileService.incrementRating(targetUserId, ratingChange);
    } else {
      await this.profileService.decrementClosedTasks(targetUserId);
      await this.profileService.decrementRating(targetUserId, ratingChange);
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
      activityType: isCompleted
        ? ActivityType.MarkHabitDay
        : ActivityType.UnmarkHabitDay,
      date: new Date(),
    });

    goal.markModified('habitCompletedDays');
    goal.markModified('activity');

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

  async searchUsersForGroupInvite(
    requesterId: string,
    queryDto: SearchGroupUsersDto,
  ) {
    const trimmedQuery = queryDto.query?.trim();

    if (!trimmedQuery) {
      throw new BadRequestException('Query is required');
    }

    const limit = Math.min(queryDto.limit ?? 10, 50);
    const excludeSet = new Set<string>(
      (queryDto.excludeUserIds || []).map((id) => id.trim()).filter(Boolean),
    );

    excludeSet.add(requesterId);

    if (queryDto.goalId) {
      const goal = await this.goalModel
        .findById(queryDto.goalId)
        .select('participants')
        .exec();

      if (!goal) {
        throw new NotFoundException('Goal not found');
      }

      goal.participants?.forEach((participant) => {
        excludeSet.add(participant.userId.toString());
      });
    }

    const excludeObjectIds = Array.from(excludeSet)
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));

    return this.profileService.searchUsersForInvite(
      trimmedQuery,
      limit,
      excludeObjectIds,
    );
  }

  async createGroupGoal(
    createGoalDto: any,
    participantIds: string[],
    image?: Express.Multer.File,
  ): Promise<Goal> {
    if (image) {
      createGoalDto.image = await this.compressAndUploadImage(image);
    }

    const userObjectId = new Types.ObjectId(createGoalDto.userId);

    // Создаем участников
    const participants = [
      {
        userId: userObjectId,
        role: 'owner',
        invitationStatus: 'accepted',
        joinedAt: new Date(),
        contributionScore: 0,
      },
      ...participantIds.map((id) => ({
        userId: new Types.ObjectId(id),
        role: 'member',
        invitationStatus: 'pending',
        contributionScore: 0,
      })),
    ];

    const createdGoal = new this.goalModel({
      ...createGoalDto,
      userId: userObjectId,
      isGroup: true,
      participants,
      groupSettings: createGoalDto.groupSettings || {
        allowMembersToInvite: false,
        requireApproval: true,
        maxParticipants: 10,
      },
    });

    const savedGoal = await createdGoal.save();

    // Инкремент статистик только для создателя
    await Promise.all([
      this.profileService.incrementGoalsCreatedThisMonth(userObjectId),
      this.profileService.incrementActiveGoals(userObjectId),
    ]);

    return savedGoal;
  }

  async addParticipant(
    goalId: string,
    userId: string,
    newParticipantId: string,
    role: string = 'member',
  ): Promise<Goal> {
    const goal = await this.goalModel.findById(goalId).exec();

    if (!goal) {
      throw new NotFoundException('Goal not found');
    }

    if (!goal.isGroup) {
      throw new BadRequestException('This is not a group goal');
    }

    // Проверка прав
    const requester = goal.participants?.find(
      (p) => p.userId.toString() === userId,
    );

    if (!requester) {
      throw new BadRequestException('You are not a participant of this goal');
    }

    const canInvite =
      requester.role === 'owner' ||
      requester.role === 'admin' ||
      (requester.role === 'member' && goal.groupSettings?.allowMembersToInvite);

    if (!canInvite) {
      throw new BadRequestException(
        'You do not have permission to add participants',
      );
    }

    // Проверка лимита участников
    const currentParticipants = goal.participants?.length || 0;
    const maxParticipants = goal.groupSettings?.maxParticipants || 10;

    if (currentParticipants >= maxParticipants) {
      throw new BadRequestException('Maximum number of participants reached');
    }

    // Проверка что участник еще не добавлен
    const alreadyParticipant = goal.participants?.some(
      (p) => p.userId.toString() === newParticipantId,
    );

    if (alreadyParticipant) {
      throw new BadRequestException('User is already a participant');
    }

    const newParticipant = {
      userId: new Types.ObjectId(newParticipantId),
      role: role as any,
      invitationStatus: 'pending' as any,
      contributionScore: 0,
    };

    goal.participants = goal.participants || [];
    goal.participants.push(newParticipant);

    return await goal.save();
  }

  async respondToInvitation(
    goalId: string,
    userId: string,
    status: 'accepted' | 'declined',
  ): Promise<Goal> {
    const goal = await this.goalModel.findById(goalId).exec();

    if (!goal) {
      throw new NotFoundException('Goal not found');
    }

    if (!goal.isGroup) {
      throw new BadRequestException('This is not a group goal');
    }

    const participant = goal.participants?.find(
      (p) => p.userId.toString() === userId,
    );

    if (!participant) {
      throw new NotFoundException('Invitation not found');
    }

    if (participant.invitationStatus !== 'pending') {
      throw new BadRequestException('Invitation already responded');
    }

    participant.invitationStatus = status as any;

    if (status === 'accepted') {
      participant.joinedAt = new Date();
      await this.profileService.incrementActiveGoals(
        new Types.ObjectId(userId),
      );
    }

    goal.markModified('participants');
    return await goal.save();
  }

  async removeParticipant(
    goalId: string,
    requesterId: string,
    participantId: string,
  ): Promise<Goal> {
    const goal = await this.goalModel.findById(goalId).exec();

    if (!goal) {
      throw new NotFoundException('Goal not found');
    }

    if (!goal.isGroup) {
      throw new BadRequestException('This is not a group goal');
    }

    const requester = goal.participants?.find(
      (p) => p.userId.toString() === requesterId,
    );

    if (!requester) {
      throw new BadRequestException('You are not a participant of this goal');
    }

    const participantToRemove = goal.participants?.find(
      (p) => p.userId.toString() === participantId,
    );

    if (!participantToRemove) {
      throw new NotFoundException('Participant not found');
    }

    // Проверка прав: owner и admin могут удалять любых, member только себя
    const canRemove =
      requester.role === 'owner' ||
      requester.role === 'admin' ||
      requesterId === participantId;

    if (!canRemove) {
      throw new BadRequestException(
        'You do not have permission to remove this participant',
      );
    }

    // Нельзя удалить владельца
    if (participantToRemove.role === 'owner') {
      throw new BadRequestException('Cannot remove the goal owner');
    }

    goal.participants = goal.participants?.filter(
      (p) => p.userId.toString() !== participantId,
    );

    // Декремент активных целей если участник принял приглашение
    if (participantToRemove.invitationStatus === 'accepted') {
      await this.profileService.decrementActiveGoals(
        new Types.ObjectId(participantId),
      );
    }

    goal.markModified('participants');
    return await goal.save();
  }

  async getGroupGoals(
    userId: string,
    paginationDto: GetGoalsPaginationDto,
  ): Promise<PaginatedGoalsResponse> {
    const {
      page = 1,
      limit = 10,
      filter = GoalFilterType.ACTIVE,
    } = paginationDto;
    const skip = (page - 1) * limit;

    const userObjectId = new Types.ObjectId(userId);

    let query: any = {
      isGroup: true,
      'participants.userId': userObjectId,
      'participants.invitationStatus': 'accepted',
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
        .populate('participants.userId', 'username')
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

  async getGroupInvitations(userId: string): Promise<Goal[]> {
    const userObjectId = new Types.ObjectId(userId);

    return await this.goalModel
      .find({
        isGroup: true,
        'participants.userId': userObjectId,
        'participants.invitationStatus': 'pending',
      })
      .populate('userId', 'username')
      .populate('participants.userId', 'username')
      .sort({ createdAt: -1 })
      .exec();
  }

  async getGroupGoalStats(goalId: string): Promise<{
    totalParticipants: number;
    activeParticipants: number;
    pendingInvitations: number;
    topContributors: Array<{
      userId: Types.ObjectId;
      contributionScore: number;
    }>;
  }> {
    const goal = await this.goalModel
      .findById(goalId)
      .populate('participants.userId', 'username')
      .exec();

    if (!goal) {
      throw new NotFoundException('Goal not found');
    }

    if (!goal.isGroup) {
      throw new BadRequestException('This is not a group goal');
    }

    const participants = goal.participants || [];
    const totalParticipants = participants.length;
    const activeParticipants = participants.filter(
      (p) => p.invitationStatus === 'accepted',
    ).length;
    const pendingInvitations = participants.filter(
      (p) => p.invitationStatus === 'pending',
    ).length;

    const topContributors = participants
      .filter((p) => p.invitationStatus === 'accepted')
      .sort((a, b) => b.contributionScore - a.contributionScore)
      .slice(0, 5)
      .map((p) => ({
        userId: p.userId,
        contributionScore: p.contributionScore,
      }));

    return {
      totalParticipants,
      activeParticipants,
      pendingInvitations,
      topContributors,
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
