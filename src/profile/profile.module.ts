import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProfileService } from './profile.service';
import { ProfileController } from './profile.controller';
import { Profile, ProfileSchema } from './schemas/profile.schema';
import { Goal, GoalSchema } from 'src/goals/schemas/goal.schema';
import {
  ProgressEntry,
  ProgressEntrySchema,
} from 'src/progress-entry/schemas/progress-entry.schema';
import { UserStats, UserStatsSchema } from './schemas/user-stats.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Profile.name, schema: ProfileSchema },
      { name: Goal.name, schema: GoalSchema },
      { name: ProgressEntry.name, schema: ProgressEntrySchema },
      { name: UserStats.name, schema: UserStatsSchema },
    ]),
  ],
  controllers: [ProfileController],
  providers: [ProfileService],
  exports: [ProfileService],
})
export class ProfileModule {}
