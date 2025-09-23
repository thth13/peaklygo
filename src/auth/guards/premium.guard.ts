import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { UserService } from 'src/user/user.service';

@Injectable()
export class PremiumGuard implements CanActivate {
  constructor(private readonly userService: UserService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;

    if (!userId) {
      throw new ForbiddenException('User not authenticated');
    }

    const isPremium =
      await this.userService.checkAndUpdatePremiumStatus(userId);

    if (!isPremium) {
      throw new ForbiddenException('Premium subscription required');
    }

    return true;
  }
}
