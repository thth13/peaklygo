import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class CheckAccessGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  handleRequest(err, user, info: Error, context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const requestUserId = request.params?.userId || request.body?.userId;

    if (requestUserId !== user.id) {
      throw new UnauthorizedException();
    }

    return user;
  }
}
