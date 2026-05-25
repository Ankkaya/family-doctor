import { ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { CreateHouseholdDto } from './dto/create-household.dto';
import { JoinHouseholdDto } from './dto/join-household.dto';
import { QueryHouseholdDto } from './dto/query-household.dto';
import { UpdateHouseholdMemberDto } from './dto/update-household-member.dto';

export type CurrentHousehold = {
  appUserId: string;
  householdId: string;
};

type CountRow = { count: bigint | number | string };

type AdminHouseholdRow = {
  id: string;
  name: string;
  code: string;
  ownerUserId: string;
  ownerNickname: string | null;
  ownerUsername: string | null;
  memberCount: number;
  medicineCount: number;
  sessionCount: number;
  lastConsultationAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

@Injectable()
export class HouseholdsService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveCurrentHousehold(appUserId: string, requestedHouseholdId?: string | null): Promise<CurrentHousehold> {
    const householdId = requestedHouseholdId?.trim();

    if (householdId) {
      const membership = await this.prisma.householdMember.findFirst({
        where: {
          userId: appUserId,
          householdId,
          deletedAt: null,
          household: {
            deletedAt: null,
          },
        },
        select: {
          householdId: true,
        },
      });

      if (!membership) {
        throw new ForbiddenException('无权访问该家庭');
      }

      return { appUserId, householdId: membership.householdId };
    }

    const user = await this.prisma.appUser.findFirst({
      where: {
        id: appUserId,
        deletedAt: null,
        status: 'active',
      },
      select: {
        defaultHouseholdId: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('App 用户不存在或已停用');
    }

    if (user.defaultHouseholdId) {
      const membership = await this.prisma.householdMember.findFirst({
        where: {
          userId: appUserId,
          householdId: user.defaultHouseholdId,
          deletedAt: null,
          household: {
            deletedAt: null,
          },
        },
        select: {
          householdId: true,
        },
      });

      if (membership) {
        return { appUserId, householdId: membership.householdId };
      }
    }

    const firstMembership = await this.prisma.householdMember.findFirst({
      where: {
        userId: appUserId,
        deletedAt: null,
        household: {
          deletedAt: null,
        },
      },
      orderBy: {
        joinedAt: 'asc',
      },
      select: {
        householdId: true,
      },
    });

    if (!firstMembership) {
      throw new NotFoundException('当前用户没有可访问的家庭');
    }

    await this.prisma.appUser.update({
      where: { id: appUserId },
      data: { defaultHouseholdId: firstMembership.householdId },
    });

    return { appUserId, householdId: firstMembership.householdId };
  }

  async listForUser(appUserId: string) {
    const rows = await this.prisma.household.findMany({
      where: {
        deletedAt: null,
        members: {
          some: {
            userId: appUserId,
            deletedAt: null,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
      include: {
        members: {
          where: { deletedAt: null },
          select: {
            userId: true,
            role: true,
          },
        },
        _count: {
          select: {
            inventory: true,
            sessions: true,
          },
        },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      code: row.code,
      ownerUserId: row.ownerUserId,
      role: row.members.find((member) => member.userId === appUserId)?.role ?? 'member',
      memberCount: row.members.length,
      medicineCount: row._count.inventory,
      sessionCount: row._count.sessions,
      createdAt: row.createdAt,
    }));
  }

  async create(appUserId: string, dto: CreateHouseholdDto) {
    const name = dto.name.trim();
    const result = await this.prisma.$transaction(async (tx) => {
      const code = await this.generateUniqueHouseholdCode(tx);
      const household = await tx.household.create({
        data: {
          name,
          ownerUserId: appUserId,
          code,
        },
      });
      await tx.householdMember.create({
        data: {
          householdId: household.id,
          userId: appUserId,
          role: 'owner',
          displayName: null,
        },
      });
      await tx.appUser.update({
        where: { id: appUserId },
        data: { defaultHouseholdId: household.id },
      });
      return household;
    });

    return result;
  }

  async joinByCode(appUserId: string, dto: JoinHouseholdDto) {
    const code = dto.code.trim().toUpperCase();
    const household = await this.prisma.household.findFirst({
      where: {
        code,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        code: true,
      },
    });

    if (!household) {
      throw new NotFoundException('家庭邀请码不存在');
    }

    const existingMembership = await this.prisma.householdMember.findFirst({
      where: {
        householdId: household.id,
        userId: appUserId,
        deletedAt: null,
      },
      select: {
        id: true,
        role: true,
      },
    });

    if (!existingMembership) {
      await this.prisma.householdMember.create({
        data: {
          householdId: household.id,
          userId: appUserId,
          role: 'member',
          displayName: null,
        },
      });
    }

    await this.prisma.appUser.update({
      where: { id: appUserId },
      data: { defaultHouseholdId: household.id },
    });

    return {
      householdId: household.id,
      id: household.id,
      name: household.name,
      code: household.code,
      role: existingMembership?.role ?? 'member',
    };
  }

  async updateMember(
    appUserId: string,
    householdId: string,
    memberId: string,
    dto: UpdateHouseholdMemberDto,
  ) {
    const ownerMembership = await this.prisma.householdMember.findFirst({
      where: {
        householdId,
        userId: appUserId,
        role: 'owner',
        deletedAt: null,
      },
      select: {
        id: true,
        role: true,
      },
    });

    if (!ownerMembership) {
      throw new ForbiddenException('只有家庭管理员可以编辑成员');
    }

    const targetMembership = await this.prisma.householdMember.findFirst({
      where: {
        id: memberId,
        householdId,
        deletedAt: null,
      },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!targetMembership) {
      throw new NotFoundException('家庭成员不存在');
    }

    const data: Prisma.HouseholdMemberUpdateInput = {};
    if (dto.role) {
      data.role = dto.role;
    }
    if (dto.displayName !== undefined) {
      data.displayName = dto.displayName.trim() || null;
    }

    return this.prisma.householdMember.update({
      where: { id: memberId },
      data,
    });
  }

  async listMembers(householdId: string) {
    return this.prisma.householdMember.findMany({
      where: {
        householdId,
        deletedAt: null,
      },
      orderBy: {
        joinedAt: 'asc',
      },
      select: {
        id: true,
        role: true,
        displayName: true,
        joinedAt: true,
        user: {
          select: {
            id: true,
            username: true,
            phone: true,
            email: true,
            nickname: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async findAdminHouseholds(query: QueryHouseholdDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const where = this.buildAdminHouseholdWhere(query.keyword?.trim());

    const [items, countRows] = await Promise.all([
      this.prisma.$queryRaw<AdminHouseholdRow[]>(Prisma.sql`
        SELECT
          h.id,
          h.name,
          h.code,
          h.owner_user_id as "ownerUserId",
          u.nickname as "ownerNickname",
          u.username as "ownerUsername",
          COUNT(DISTINCT hm.id)::int as "memberCount",
          COUNT(DISTINCT i.id)::int as "medicineCount",
          COUNT(DISTINCT s.id)::int as "sessionCount",
          MAX(s.created_at) as "lastConsultationAt",
          h.created_at as "createdAt",
          h.updated_at as "updatedAt"
        FROM household h
        LEFT JOIN app_user u ON u.id = h.owner_user_id
        LEFT JOIN household_member hm ON hm.household_id = h.id AND hm.deleted_at IS NULL
        LEFT JOIN household_medicine_inventory i ON i.household_id = h.id AND i.deleted_at IS NULL
        LEFT JOIN consultation_session s ON s.household_id = h.id
        ${where}
        GROUP BY h.id, u.nickname, u.username
        ORDER BY h.created_at DESC
        LIMIT ${pageSize}
        OFFSET ${skip}
      `),
      this.prisma.$queryRaw<CountRow[]>(Prisma.sql`
        SELECT COUNT(*) as count
        FROM household h
        LEFT JOIN app_user u ON u.id = h.owner_user_id
        ${where}
      `),
    ]);

    return {
      items,
      total: Number(countRows[0]?.count ?? 0),
      page,
      pageSize,
    };
  }

  async findAdminHousehold(id: string) {
    const rows = await this.prisma.$queryRaw<AdminHouseholdRow[]>(Prisma.sql`
      SELECT
          h.id,
          h.name,
          h.code,
          h.owner_user_id as "ownerUserId",
          u.nickname as "ownerNickname",
          u.username as "ownerUsername",
          COUNT(DISTINCT hm.id)::int as "memberCount",
        COUNT(DISTINCT i.id)::int as "medicineCount",
        COUNT(DISTINCT s.id)::int as "sessionCount",
        MAX(s.created_at) as "lastConsultationAt",
        h.created_at as "createdAt",
        h.updated_at as "updatedAt"
      FROM household h
      LEFT JOIN app_user u ON u.id = h.owner_user_id
      LEFT JOIN household_member hm ON hm.household_id = h.id AND hm.deleted_at IS NULL
      LEFT JOIN household_medicine_inventory i ON i.household_id = h.id AND i.deleted_at IS NULL
      LEFT JOIN consultation_session s ON s.household_id = h.id
      WHERE h.id = ${id}
        AND h.deleted_at IS NULL
      GROUP BY h.id, u.nickname, u.username
      LIMIT 1
    `);

    const household = rows[0];
    if (!household) {
      throw new NotFoundException('家庭不存在');
    }

    return household;
  }

  async removeAdminHousehold(id: string) {
    const household = await this.prisma.household.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!household) {
      throw new NotFoundException('家庭不存在');
    }

    const deletedAt = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.household.updateMany({
        where: {
          id,
          deletedAt: null,
        },
        data: {
          deletedAt,
          updatedAt: deletedAt,
        },
      });
      await tx.householdMember.updateMany({
        where: {
          householdId: id,
          deletedAt: null,
        },
        data: {
          deletedAt,
        },
      });
      await tx.householdMedicineInventory.updateMany({
        where: {
          householdId: id,
          deletedAt: null,
        },
        data: {
          deletedAt,
          updatedAt: deletedAt,
        },
      });
      await tx.consultationSession.updateMany({
        where: {
          householdId: id,
          deletedAt: null,
        },
        data: {
          deletedAt,
        },
      });
      await tx.appUser.updateMany({
        where: {
          defaultHouseholdId: id,
          deletedAt: null,
        },
        data: {
          defaultHouseholdId: null,
          updatedAt: deletedAt,
        },
      });
    });

    return { success: true };
  }

  private buildAdminHouseholdWhere(keyword?: string) {
    if (!keyword) {
      return Prisma.sql`WHERE h.deleted_at IS NULL`;
    }

    const like = `%${keyword}%`;
    return Prisma.sql`
      WHERE h.deleted_at IS NULL
        AND (
          h.name ILIKE ${like}
          OR u.nickname ILIKE ${like}
          OR u.username ILIKE ${like}
        )
    `;
  }

  private async generateUniqueHouseholdCode(tx: Pick<PrismaService, 'household'>) {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const code = randomBytes(3).toString('hex').toUpperCase();
      const existing = await tx.household.findFirst({
        where: {
          code,
        },
        select: {
          id: true,
        },
      });

      if (!existing) {
        return code;
      }
    }

    throw new Error('无法生成唯一家庭邀请码');
  }
}
