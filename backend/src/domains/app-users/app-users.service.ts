import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { QueryAppUserDto } from './dto/query-app-user.dto';

type CountRow = { count: bigint | number | string };

type AdminAppUserRow = {
  id: string;
  username: string | null;
  phone: string | null;
  email: string | null;
  nickname: string | null;
  avatarUrl: string | null;
  status: string;
  defaultHouseholdId: string | null;
  defaultHouseholdName: string | null;
  defaultHouseholdCode: string | null;
  householdCount: number;
  ownedHouseholdCount: number;
  medicineCount: number;
  sessionCount: number;
  lastConsultationAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type AdminAppUserHouseholdRow = {
  id: string;
  name: string;
  code: string;
  ownerUserId: string;
  role: string;
  displayName: string | null;
  joinedAt: Date | string;
  memberCount: number;
  medicineCount: number;
  sessionCount: number;
  createdAt: Date | string;
};

const SELECT_APP_USER_COLUMNS = Prisma.sql`
  u.id,
  u.username,
  u.phone,
  u.email,
  u.nickname,
  u.avatar_url as "avatarUrl",
  u.age,
  u.gender,
  u.allergies,
  u.medication_history as "medicationHistory",
  u.status,
  u.default_household_id as "defaultHouseholdId",
  dh.name as "defaultHouseholdName",
  dh.code as "defaultHouseholdCode",
  COALESCE(household_stats.household_count, 0)::int as "householdCount",
  COALESCE(owned_stats.owned_household_count, 0)::int as "ownedHouseholdCount",
  COALESCE(medicine_stats.medicine_count, 0)::int as "medicineCount",
  COALESCE(session_stats.session_count, 0)::int as "sessionCount",
  session_stats.last_consultation_at as "lastConsultationAt",
  u.created_at as "createdAt",
  u.updated_at as "updatedAt"
`;

const APP_USER_STATS_JOINS = Prisma.sql`
  LEFT JOIN household dh ON dh.id = u.default_household_id AND dh.deleted_at IS NULL
  LEFT JOIN (
    SELECT hm.user_id, COUNT(DISTINCT hm.household_id) as household_count
    FROM household_member hm
    INNER JOIN household h ON h.id = hm.household_id AND h.deleted_at IS NULL
    WHERE hm.deleted_at IS NULL
    GROUP BY hm.user_id
  ) household_stats ON household_stats.user_id = u.id
  LEFT JOIN (
    SELECT owner_user_id as user_id, COUNT(*) as owned_household_count
    FROM household
    WHERE deleted_at IS NULL
    GROUP BY owner_user_id
  ) owned_stats ON owned_stats.user_id = u.id
  LEFT JOIN (
    SELECT hm.user_id, COUNT(DISTINCT i.id) as medicine_count
    FROM household_member hm
    INNER JOIN household h ON h.id = hm.household_id AND h.deleted_at IS NULL
    INNER JOIN household_medicine_inventory i ON i.household_id = h.id AND i.deleted_at IS NULL
    WHERE hm.deleted_at IS NULL
    GROUP BY hm.user_id
  ) medicine_stats ON medicine_stats.user_id = u.id
  LEFT JOIN (
    SELECT user_id, COUNT(*) as session_count, MAX(created_at) as last_consultation_at
    FROM consultation_session
    WHERE user_id IS NOT NULL
    GROUP BY user_id
  ) session_stats ON session_stats.user_id = u.id
`;

@Injectable()
export class AppUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryAppUserDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const where = this.buildAppUserWhere(query);

    const [items, countRows] = await Promise.all([
      this.prisma.$queryRaw<AdminAppUserRow[]>(Prisma.sql`
        SELECT ${SELECT_APP_USER_COLUMNS}
        FROM app_user u
        ${APP_USER_STATS_JOINS}
        ${where}
        ORDER BY u.created_at DESC
        LIMIT ${pageSize}
        OFFSET ${skip}
      `),
      this.prisma.$queryRaw<CountRow[]>(Prisma.sql`
        SELECT COUNT(*) as count
        FROM app_user u
        LEFT JOIN household dh ON dh.id = u.default_household_id AND dh.deleted_at IS NULL
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

  async findOne(id: string) {
    const rows = await this.prisma.$queryRaw<AdminAppUserRow[]>(Prisma.sql`
      SELECT ${SELECT_APP_USER_COLUMNS}
      FROM app_user u
      ${APP_USER_STATS_JOINS}
      WHERE u.id = ${id}
        AND u.deleted_at IS NULL
      LIMIT 1
    `);

    const user = rows[0];
    if (!user) {
      throw new NotFoundException('App 用户不存在');
    }

    return user;
  }

  async findHouseholds(id: string) {
    await this.assertExists(id);

    return this.prisma.$queryRaw<AdminAppUserHouseholdRow[]>(Prisma.sql`
      SELECT
        h.id,
        h.name,
        h.code,
        h.owner_user_id as "ownerUserId",
        hm.role,
        hm.display_name as "displayName",
        hm.joined_at as "joinedAt",
        COUNT(DISTINCT active_members.id)::int as "memberCount",
        COUNT(DISTINCT i.id)::int as "medicineCount",
        COUNT(DISTINCT s.id)::int as "sessionCount",
        h.created_at as "createdAt"
      FROM household_member hm
      INNER JOIN household h ON h.id = hm.household_id AND h.deleted_at IS NULL
      LEFT JOIN household_member active_members
        ON active_members.household_id = h.id
        AND active_members.deleted_at IS NULL
      LEFT JOIN household_medicine_inventory i
        ON i.household_id = h.id
        AND i.deleted_at IS NULL
      LEFT JOIN consultation_session s ON s.household_id = h.id
      WHERE hm.user_id = ${id}
        AND hm.deleted_at IS NULL
      GROUP BY h.id, hm.id
      ORDER BY hm.joined_at ASC
    `);
  }

  async updateStatus(id: string, status: 'active' | 'disabled') {
    await this.assertExists(id);
    await this.prisma.appUser.update({
      where: { id },
      data: { status },
    });

    return this.findOne(id);
  }

  async resetPassword(id: string, password: string) {
    await this.assertExists(id);
    await this.prisma.appUser.update({
      where: { id },
      data: {
        passwordHash: await bcrypt.hash(password, 10),
      },
    });

    return { success: true };
  }

  async remove(id: string) {
    await this.assertExists(id);
    const deletedAt = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.appUser.updateMany({
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
          userId: id,
          deletedAt: null,
        },
        data: {
          deletedAt,
        },
      });
      await tx.consultationSession.updateMany({
        where: {
          userId: id,
          deletedAt: null,
        },
        data: {
          deletedAt,
        },
      });
    });

    return { success: true };
  }

  private async assertExists(id: string) {
    const user = await this.prisma.appUser.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!user) {
      throw new NotFoundException('App 用户不存在');
    }
  }

  private buildAppUserWhere(query: QueryAppUserDto) {
    const conditions: Prisma.Sql[] = [Prisma.sql`u.deleted_at IS NULL`];

    if (query.status) {
      conditions.push(Prisma.sql`u.status = ${query.status}`);
    }

    if (query.keyword?.trim()) {
      const like = `%${query.keyword.trim()}%`;
      conditions.push(Prisma.sql`(
        u.id ILIKE ${like}
        OR u.username ILIKE ${like}
        OR u.phone ILIKE ${like}
        OR u.email ILIKE ${like}
        OR u.nickname ILIKE ${like}
        OR dh.name ILIKE ${like}
        OR dh.code ILIKE ${like}
      )`);
    }

    return Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`;
  }
}
