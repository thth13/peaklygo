import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { InjectS3, S3 } from 'nestjs-s3';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import * as sharp from 'sharp';
import { ProfileService } from 'src/profile/profile.service';
import { NotificationsService } from 'src/notifications/notifications.service';
import { NotificationType } from 'src/notifications/interfaces/notification.interface';
import {
  GoalFilterType,
  GetGoalsPaginationDto,
  CreateStepDto,
  UpdateStepDto,
} from 'src/goals/dto/goal.dto';
import {
  PaginatedGoalsResponse,
  ActivityType,
} from 'src/goals/interfaces/goal.interface';
import { CreateGroupGoalDto, SearchGroupUsersDto } from './dto/group-goal.dto';
import {
  GroupGoal,
  Participant,
  ParticipantRole,
  InvitationStatus,
} from './interfaces/group-goal.interface';
import {
  GroupGoal as GroupGoalSchema,
  GroupGoalDocument,
} from './schemas/group-goal.schema';

@Injectable()
export class GroupGoalsService {
  constructor(
    @InjectModel(GroupGoalSchema.name)
    private readonly groupGoalModel: Model<GroupGoalDocument>,
    @InjectS3() private readonly s3: S3,
    private readonly profileService: ProfileService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createGroupGoal(
    createGroupGoalDto: CreateGroupGoalDto,
    participantIds: string[],
    image?: Express.Multer.File,
  ): Promise<GroupGoalDocument> {
    if (image) {
      createGroupGoalDto.image = await this.compressAndUploadImage(image);
    }

    const userObjectId = new Types.ObjectId(createGroupGoalDto.userId);

    const participants: Participant[] = [
      {
        userId: userObjectId,
        role: ParticipantRole.Owner,
        invitationStatus: InvitationStatus.Accepted,
        joinedAt: new Date(),
        contributionScore: 0,
      },
      ...participantIds.map((id) => ({
        userId: new Types.ObjectId(id),
        role: ParticipantRole.Member,
        invitationStatus: InvitationStatus.Pending,
        contributionScore: 0,
      })),
    ];

    const createdGoal = new this.groupGoalModel({
      ...createGroupGoalDto,
      userId: userObjectId,
      isGroup: true,
      participants,
      groupSettings: createGroupGoalDto.groupSettings || {
        allowMembersToInvite: false,
        requireApproval: true,
        maxParticipants: 10,
      },
    });

    const savedGoal = await createdGoal.save();

    await Promise.all([
      this.profileService.incrementGoalsCreatedThisMonth(userObjectId),
      this.profileService.incrementActiveGoals(userObjectId),
    ]);

    if (participantIds.length) {
      await this.notificationsService.createMany(
        participantIds.map((participantId) => ({
          userId: participantId,
          type: NotificationType.GroupInvite,
          title: 'Group goal invitation',
          message: `You have been invited to the group goal "${savedGoal.goalName}"`,
          metadata: {
            goalId: savedGoal._id,
            inviterId: createGroupGoalDto.userId,
          },
        })),
      );
    }

    return savedGoal;
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
      const goal = await this.groupGoalModel
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

  async addParticipant(
    goalId: string,
    userId: string,
    newParticipantId: string,
    role: string = 'member',
  ): Promise<GroupGoalDocument> {
    const goal = await this.groupGoalModel.findById(goalId).exec();

    if (!goal) {
      throw new NotFoundException('Goal not found');
    }

    if (!goal.isGroup) {
      throw new BadRequestException('This is not a group goal');
    }

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

    const currentParticipants = goal.participants?.length || 0;
    const maxParticipants = goal.groupSettings?.maxParticipants || 10;

    if (currentParticipants >= maxParticipants) {
      throw new BadRequestException('Maximum number of participants reached');
    }

    const alreadyParticipant = goal.participants?.some(
      (p) => p.userId.toString() === newParticipantId,
    );

    if (alreadyParticipant) {
      throw new BadRequestException('User is already a participant');
    }

    const newParticipant = {
      userId: new Types.ObjectId(newParticipantId),
      role: role as ParticipantRole,
      invitationStatus: InvitationStatus.Pending,
      contributionScore: 0,
    };

    goal.participants = goal.participants || [];
    goal.participants.push(newParticipant);

    const updatedGoal = await goal.save();

    await this.notificationsService.create({
      userId: newParticipantId,
      type: NotificationType.GroupInvite,
      title: 'Group goal invitation',
      message: `You have been invited to the group goal "${goal.goalName}"`,
      metadata: {
        goalId: goal._id,
        inviterId: userId,
      },
    });

    return updatedGoal;
  }

  async respondToInvitation(
    goalId: string,
    userId: string,
    status: 'accepted' | 'declined',
  ): Promise<GroupGoalDocument> {
    const goal = await this.groupGoalModel.findById(goalId).exec();

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

    if (participant.invitationStatus !== InvitationStatus.Pending) {
      throw new BadRequestException('Invitation already responded');
    }

    participant.invitationStatus =
      status === 'accepted'
        ? InvitationStatus.Accepted
        : InvitationStatus.Declined;

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
  ): Promise<GroupGoalDocument> {
    const goal = await this.groupGoalModel.findById(goalId).exec();

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

    const canRemove =
      requester.role === 'owner' ||
      requester.role === 'admin' ||
      requesterId === participantId;

    if (!canRemove) {
      throw new BadRequestException(
        'You do not have permission to remove this participant',
      );
    }

    if (participantToRemove.role === 'owner') {
      throw new BadRequestException('Cannot remove the goal owner');
    }

    goal.participants = goal.participants?.filter(
      (p) => p.userId.toString() !== participantId,
    );

    if (participantToRemove.invitationStatus === InvitationStatus.Accepted) {
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

    const query: any = {
      isGroup: true,
      'participants.userId': userObjectId,
      'participants.invitationStatus': InvitationStatus.Accepted,
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
      this.groupGoalModel
        .find(query)
        .populate('participants.userId', 'username')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.groupGoalModel.countDocuments(query),
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

  async getGroupInvitations(userId: string): Promise<GroupGoalDocument[]> {
    const userObjectId = new Types.ObjectId(userId);

    return await this.groupGoalModel
      .find({
        isGroup: true,
        'participants.userId': userObjectId,
        'participants.invitationStatus': InvitationStatus.Pending,
      })
      .populate('userId', 'username')
      .populate('participants.userId', 'username')
      .sort({ createdAt: -1 })
      .exec();
  }

  async getGroupGoalById(goalId: string): Promise<GroupGoalDocument> {
    const goal = await this.groupGoalModel
      .findById(goalId)
      .populate('userId', 'username')
      .populate('participants.userId', 'username')
      .exec();

    if (!goal) {
      throw new NotFoundException('Goal not found');
    }

    if (!goal.isGroup) {
      throw new BadRequestException('This is not a group goal');
    }

    return goal;
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
    const goal = await this.groupGoalModel
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
      (p) => p.invitationStatus === InvitationStatus.Accepted,
    ).length;
    const pendingInvitations = participants.filter(
      (p) => p.invitationStatus === InvitationStatus.Pending,
    ).length;

    const topContributors = participants
      .filter((p) => p.invitationStatus === InvitationStatus.Accepted)
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

  async markStepCompleted(
    goalId: string,
    stepId: string,
    isCompleted: boolean,
    userId: string,
  ): Promise<GroupGoalDocument> {
    const goal = await this.groupGoalModel
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

    if (!goal.isGroup) {
      throw new BadRequestException('This is not a group goal');
    }

    await this.calculateAndUpdateProgress(goalId);

    const ratingChange = Math.floor(goal.value / 10);

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

    const targetUserId = new Types.ObjectId(userId);

    if (isCompleted) {
      await this.profileService.incrementClosedTasks(targetUserId);
      await this.profileService.incrementRating(targetUserId, ratingChange);
    } else {
      await this.profileService.decrementClosedTasks(targetUserId);
      await this.profileService.decrementRating(targetUserId, ratingChange);
    }

    return this.groupGoalModel.findById(goalId).exec();
  }

  async createStep(
    goalId: string,
    createStepDto: CreateStepDto,
  ): Promise<GroupGoalDocument> {
    const goal = await this.groupGoalModel.findById(goalId).exec();

    if (!goal) {
      throw new NotFoundException('Goal not found');
    }

    if (!goal.isGroup) {
      throw new BadRequestException('This is not a group goal');
    }

    const newStep = {
      id: randomUUID(),
      text: createStepDto.text,
      isCompleted: false,
    };

    goal.steps.push(newStep);
    await goal.save();

    await this.calculateAndUpdateProgress(goalId);

    return this.groupGoalModel.findById(goalId).exec();
  }

  async deleteStep(goalId: string, stepId: string): Promise<GroupGoalDocument> {
    const goal = await this.groupGoalModel.findById(goalId).exec();

    if (!goal) {
      throw new NotFoundException('Goal not found');
    }

    if (!goal.isGroup) {
      throw new BadRequestException('This is not a group goal');
    }

    const stepIndex = goal.steps.findIndex((step) => step.id === stepId);
    if (stepIndex === -1) {
      throw new NotFoundException('Step not found');
    }

    goal.steps.splice(stepIndex, 1);
    await goal.save();

    await this.calculateAndUpdateProgress(goalId);

    return this.groupGoalModel.findById(goalId).exec();
  }

  async editStep(
    goalId: string,
    stepId: string,
    updateStepDto: UpdateStepDto,
  ): Promise<GroupGoalDocument> {
    const goal = await this.groupGoalModel.findById(goalId).exec();

    if (!goal) {
      throw new NotFoundException('Goal not found');
    }

    if (!goal.isGroup) {
      throw new BadRequestException('This is not a group goal');
    }

    const step = goal.steps.find((item) => item.id === stepId);

    if (!step) {
      throw new NotFoundException('Step not found');
    }

    step.text = updateStepDto.text;
    goal.markModified('steps');
    await goal.save();

    return this.groupGoalModel.findById(goalId).exec();
  }

  private async calculateAndUpdateProgress(goalId: string): Promise<number> {
    const goal = await this.groupGoalModel.findById(goalId).exec();

    if (!goal) {
      throw new NotFoundException('Goal not found');
    }

    const totalSteps = goal.steps.length;
    const completedSteps = goal.steps.filter((step) => step.isCompleted).length;
    const newProgress =
      totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

    await this.groupGoalModel
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
