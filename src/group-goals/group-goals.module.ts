import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GroupGoalsController } from './group-goals.controller';
import { GroupGoalsService } from './group-goals.service';
import { GroupGoal, GroupGoalSchema } from './schemas/group-goal.schema';
import { ProfileModule } from 'src/profile/profile.module';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { ProgressEntryModule } from 'src/progress-entry/progress-entry.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GroupGoal.name, schema: GroupGoalSchema },
    ]),
    ProfileModule,
    NotificationsModule,
    ProgressEntryModule,
  ],
  controllers: [GroupGoalsController],
  providers: [GroupGoalsService],
  exports: [GroupGoalsService],
})
export class GroupGoalsModule {}
