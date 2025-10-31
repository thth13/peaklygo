import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProgressEntryController } from './progress-entry.controller';
import { ProgressEntryService } from './progress-entry.service';
import {
  ProgressEntry,
  ProgressEntrySchema,
} from './schemas/progress-entry.schema';
import { Comment, CommentSchema } from './schemas/comment.schema';
import { Goal, GoalSchema } from '../goals/schemas/goal.schema';
import {
  GroupGoal,
  GroupGoalSchema,
} from '../group-goals/schemas/group-goal.schema';
import { Profile, ProfileSchema } from '../profile/schemas/profile.schema';
import { ProfileModule } from '../profile/profile.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ProgressEntry.name, schema: ProgressEntrySchema },
      { name: Comment.name, schema: CommentSchema },
      { name: Goal.name, schema: GoalSchema },
      { name: GroupGoal.name, schema: GroupGoalSchema },
      { name: Profile.name, schema: ProfileSchema },
    ]),
    ProfileModule,
  ],
  controllers: [ProgressEntryController],
  providers: [ProgressEntryService],
  exports: [ProgressEntryService],
})
export class ProgressEntryModule {}
