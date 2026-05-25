import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.userId ?? request.user?.sub;

    if (!userId) {
      throw new ForbiddenException('缺少用户身份');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          where: { deletedAt: null },
          include: {
            menus: {
              where: { deletedAt: null },
              select: {
                path: true,
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!user || user.deletedAt) {
      throw new ForbiddenException('用户不存在或已禁用');
    }

    if (user.roles.some((role) => role.code === 'admin')) {
      return true;
    }

    const ownedPermissions = new Set<string>();
    for (const role of user.roles) {
      for (const menu of role.menus) {
        if (menu.permission) {
          ownedPermissions.add(menu.permission);
        }
        if (menu.path) {
          ownedPermissions.add(menu.path);
        }
      }
    }

    const allowed = requiredPermissions.every((permission) => ownedPermissions.has(permission));
    if (!allowed) {
      throw new ForbiddenException('没有权限执行该操作');
    }

    request.user.permissions = Array.from(ownedPermissions);
    return true;
  }
}
