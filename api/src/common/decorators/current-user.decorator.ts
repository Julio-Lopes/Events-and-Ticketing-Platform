import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Role } from '../../prisma/client';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
}

export const CurrentUser = createParamDecorator(
  (data: keyof AuthUser | undefined, ctx: ExecutionContext) => {
    const user = ctx.switchToHttp().getRequest().user as AuthUser;
    return data ? user?.[data] : user;
  },
);
