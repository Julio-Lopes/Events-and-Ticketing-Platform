import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../../prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuthUser } from '../decorators/current-user.decorator';

/**
 * Um usuario tem exatamente um papel. O desafio pede tres papeis
 * distintos, entao modelar como enum em vez de tabela de permissoes
 * mantem o codigo honesto com o requisito, sem inventar RBAC generico
 * que ninguem pediu.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;

    const user = context.switchToHttp().getRequest().user as AuthUser;
    if (!user || !required.includes(user.role)) {
      throw new ForbiddenException('Seu papel nao permite esta acao.');
    }
    return true;
  }
}
