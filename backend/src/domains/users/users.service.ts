import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { IconAssetsService } from '@/infrastructure/icon-assets/icon-assets.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserVo, UserWithRolesVo } from '@/users/vo';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private readonly iconAssetsService: IconAssetsService,
  ) {}

  async create(createUserDto: CreateUserDto) {
    // 检查用户名是否存在（排除已删除的用户）
    const existingUser = await this.prisma.user.findFirst({
      where: { 
        username: createUserDto.username,
        deletedAt: null 
      },
    });

    if (existingUser) {
      throw new ConflictException('用户名已存在');
    }

    // 检查邮箱是否存在（如果提供了邮箱，排除已删除的用户）
    if (createUserDto.email) {
      const existingEmail = await this.prisma.user.findFirst({
        where: { 
          email: createUserDto.email,
          deletedAt: null 
        },
      });
      if (existingEmail) {
        throw new ConflictException('邮箱已被使用');
      }
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        ...createUserDto,
        password: hashedPassword,
      },
    });

    return UserVo.fromEntity(user);
  }

  async findByUsername(username: string) {
    return this.prisma.user.findFirst({
      where: { 
        username,
        deletedAt: null 
      },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findFirst({
      where: { 
        email,
        deletedAt: null 
      },
    });
  }

  async findById(id: number) {
    const user = await this.prisma.user.findFirst({
      where: { 
        id,
        deletedAt: null 
      },
      include: {
        roles: {
          include: {
            menus: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    return UserWithRolesVo.fromEntity(user);
  }

  async findAll() {
    const users = await this.prisma.user.findMany({
      where: { deletedAt: null },
    });
    return UserVo.fromEntities(users);
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    const existingUser = await this.prisma.user.findFirst({
      where: { 
        id,
        deletedAt: null 
      },
    });

    if (!existingUser) {
      throw new NotFoundException('用户不存在');
    }

    // 检查邮箱是否被其他用户使用（排除已删除的用户）
    if (updateUserDto.email && updateUserDto.email !== existingUser.email) {
      const duplicateEmail = await this.prisma.user.findFirst({
        where: { 
          email: updateUserDto.email,
          deletedAt: null,
          NOT: { id }
        },
      });
      if (duplicateEmail) {
        throw new ConflictException('邮箱已被使用');
      }
    }

    // 如果更新密码，需要加密
    const data: any = { ...updateUserDto };
    if (updateUserDto.password) {
      data.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    const user = await this.prisma.user.update({
      where: { id },
      data,
      include: {
        roles: true,
      },
    });

    return UserWithRolesVo.fromEntity(user);
  }

  async resetPassword(id: number, password: string) {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        id,
        deletedAt: null
      },
      include: {
        roles: true,
      },
    });

    if (!existingUser) {
      throw new NotFoundException('用户不存在');
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        password: await bcrypt.hash(password, 10),
      },
      include: {
        roles: true,
      },
    });

    return UserWithRolesVo.fromEntity(user);
  }

  async remove(id: number) {
    const user = await this.prisma.user.findFirst({
      where: { 
        id,
        deletedAt: null 
      },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 检查是否是最后一个管理员（可选的业务逻辑）
    const adminRole = await this.prisma.role.findUnique({
      where: { code: 'admin' },
      include: { 
        users: {
          where: { deletedAt: null }
        } 
      },
    });

    if (adminRole && adminRole.users.length === 1 && adminRole.users[0].id === id) {
      throw new ConflictException('不能删除最后一个管理员');
    }

    // 软删除：更新 deletedAt 字段
    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
    return { id, message: '用户已删除' };
  }

  async removeMany(ids: number[]) {
    const uniqueIds = Array.from(new Set(ids));
    if (uniqueIds.length === 0) {
      return { count: 0, ids: [] };
    }

    const users = await this.prisma.user.findMany({
      where: { id: { in: uniqueIds }, deletedAt: null },
      include: { roles: true },
    });

    if (users.length !== uniqueIds.length) {
      throw new NotFoundException('部分用户不存在或已删除');
    }

    const adminRole = await this.prisma.role.findUnique({
      where: { code: 'admin' },
      include: {
        users: {
          where: { deletedAt: null },
          select: { id: true },
        },
      },
    });

    if (adminRole) {
      const deletingIds = new Set(uniqueIds);
      const remainingAdminCount = adminRole.users.filter(user => !deletingIds.has(user.id)).length;
      if (remainingAdminCount === 0 && users.some(user => user.roles.some(role => role.id === adminRole.id))) {
        throw new ConflictException('不能删除最后一个管理员');
      }
    }

    const result = await this.prisma.user.updateMany({
      where: { id: { in: uniqueIds }, deletedAt: null },
      data: { deletedAt: new Date() },
    });

    return { count: result.count, ids: uniqueIds };
  }

  // 获取用户完整信息（包括角色）
  async findUserWithRoles(userId: number) {
    const user = await this.prisma.user.findFirst({
      where: { 
        id: userId,
        deletedAt: null 
      },
      include: {
        roles: {
          include: {
            menus: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    return UserWithRolesVo.fromEntity(user);
  }

  // 为用户分配角色
  async assignRoles(userId: number, roleIds: number[]) {
    const user = await this.prisma.user.findFirst({
      where: { 
        id: userId,
        deletedAt: null 
      },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        roles: {
          set: roleIds.map((id) => ({ id })),
        },
      },
      include: {
        roles: true,
      },
    });
  }

  // 获取用户角色
  async getUserRoles(userId: number) {
    const user = await this.prisma.user.findFirst({
      where: { 
        id: userId,
        deletedAt: null 
      },
      include: {
        roles: true,
      },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    return user.roles;
  }

  // 获取用户菜单（聚合所有角色的菜单）
  async getUserMenus(userId: number, format: string = 'tree') {
    const user = await this.prisma.user.findFirst({
      where: { 
        id: userId,
        deletedAt: null 
      },
      include: {
        roles: {
          include: {
            menus: {
              include: {
                children: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 获取所有角色的菜单并去重
    const menuSet = new Map<number, any>();

    for (const role of user.roles) {
      for (const menu of role.menus) {
        if (!menuSet.has(menu.id)) {
          menuSet.set(menu.id, menu);
        }
      }
    }

    const menus = Array.from(menuSet.values());

    // 根据格式返回
    if (format === 'flat') {
      const flatMenus = menus.map(menu => {
        const { children, ...rest } = menu;
        return rest;
      });
      return Promise.all(flatMenus.map(menu => this.attachIconUrl(menu)));
    }

    // 默认返回树形结构
    const treeMenus = this.buildTree(menus);
    return Promise.all(treeMenus.map(menu => this.attachIconUrl(menu)));
  }

  // 构建树形结构
  private buildTree(menus: any[]): any[] {
    const menuMap = new Map<number, any>();
    const roots: any[] = [];

    // 先建立映射
    menus.forEach((menu) => {
      menuMap.set(menu.id, { ...menu, children: [] });
    });

    // 构建树
    menus.forEach((menu) => {
      const menuNode = menuMap.get(menu.id);
      if (menu.parentId) {
        const parent = menuMap.get(menu.parentId);
        if (parent) {
          parent.children.push(menuNode);
        }
      } else {
        roots.push(menuNode);
      }
    });

    // 移除空数组字段
    const cleanMenu = (menu: any) => {
      if (menu.children.length === 0) {
        delete menu.children;
      } else {
        menu.children.forEach(cleanMenu);
      }
      delete menu.parent;
    };

    roots.forEach(cleanMenu);

    return roots;
  }

  private async attachIconUrl(menu: any): Promise<any> {
    const children = menu.children?.length
      ? await Promise.all(menu.children.map((child: any) => this.attachIconUrl(child)))
      : undefined;

    return {
      ...menu,
      iconUrl: await this.iconAssetsService.resolveIconUrl(menu.icon),
      ...(children ? { children } : {}),
    };
  }
}
