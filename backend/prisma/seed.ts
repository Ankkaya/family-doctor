import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import { Pool } from 'pg';
import '../load-env';

const connectionString = process.env.DATABASE_URL;
if (typeof connectionString !== 'string' || connectionString.trim().length === 0) {
  throw new Error('DATABASE_URL 未配置或不是有效字符串');
}

const pool = new Pool({ connectionString });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  console.log('🌱 开始初始化数据...');

  // 1. 创建角色
  const adminRole = await prisma.role.upsert({
    where: { code: 'admin' },
    update: {},
    create: {
      name: '超级管理员',
      code: 'admin',
      description: '拥有所有权限',
    },
  });

  const userRole = await prisma.role.upsert({
    where: { code: 'user' },
    update: {},
    create: {
      name: '普通用户',
      code: 'user',
      description: '基础权限',
    },
  });

  console.log('✅ 角色创建完成:', adminRole.name, userRole.name);

  // 2. 创建管理员用户
  const hashedPassword = await bcrypt.hash('123456', 10);
  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: hashedPassword,
      name: '系统管理员',
      email: 'admin@platform.local',
      roles: {
        connect: [{ id: adminRole.id }],
      },
    },
  });

  console.log('✅ 管理员用户创建完成:', adminUser.username, '/ 密码: 123456');

  // 3. 创建基础菜单
  const systemMenu = await prisma.menu.upsert({
    where: { id: 1 },
    update: {
      name: '系统管理',
      path: '/system',
      icon: 'material-symbols:settings-outline',
      permission: null,
      order: 1,
      type: 'menu',
    },
    create: {
      id: 1,
      name: '系统管理',
      path: '/system',
      icon: 'material-symbols:settings-outline',
      permission: null,
      order: 1,
      type: 'menu',
    },
  });

  const menuItems = [
    { id: 10, name: '用户管理', path: '/system/users', icon: 'material-symbols:person-outline', component: 'views/system/users/index', permission: 'system:user:view', parentId: systemMenu.id, order: 1 },
    { id: 11, name: '角色管理', path: '/system/roles', icon: 'material-symbols:groups-outline', component: 'views/system/roles/index', permission: 'system:role:view', parentId: systemMenu.id, order: 2 },
    { id: 12, name: '菜单管理', path: '/system/menus', icon: 'material-symbols:menu', component: 'views/system/menus/index', permission: 'system:menu:view', parentId: systemMenu.id, order: 3 },
    { id: 13, name: '系统配置', path: '/system/settings', icon: 'material-symbols:tune', component: 'views/system/settings/index', permission: 'system:setting:view', parentId: systemMenu.id, order: 4 },
    { id: 14, name: '操作日志', path: '/system/logs', icon: 'material-symbols:history-rounded', component: 'views/system/logs/index', permission: 'system:log:view', parentId: systemMenu.id, order: 5 },
    { id: 15, name: '上传记录', path: '/system/upload-records', icon: 'mdi:cloud-upload-outline', component: 'views/system/upload-records/index', permission: 'system:upload-record:view', parentId: systemMenu.id, order: 6 },
    { id: 16, name: '字典管理', path: '/system/dictionaries', icon: 'material-symbols:format-list-bulleted', component: 'views/system/dictionaries/index', permission: 'system:dictionary:view', parentId: systemMenu.id, order: 7 },
  ];

  for (const item of menuItems) {
    await prisma.menu.upsert({
      where: { id: item.id },
      update: {
        ...item,
        type: 'menu',
      },
      create: {
        ...item,
        type: 'menu',
      },
    });
  }

  const familyDoctorMenu = await prisma.menu.upsert({
    where: { id: 30 },
    update: {
      name: '家庭医生',
      path: '/family-doctor',
      icon: 'material-symbols:medical-services-outline',
      permission: null,
      order: 2,
      type: 'menu',
      hidden: false,
    },
    create: {
      id: 30,
      name: '家庭医生',
      path: '/family-doctor',
      icon: 'material-symbols:medical-services-outline',
      permission: null,
      order: 2,
      type: 'menu',
    },
  });

  const familyDoctorMenuItems = [
    { id: 31, name: '家庭药品汇总', path: '/family-doctor/medicines', icon: 'material-symbols:pill-outline', component: 'views/family-doctor/household-medicines/index', permission: 'family-doctor:household-medicine:view', parentId: familyDoctorMenu.id, order: 1 },
    { id: 32, name: '问诊日志', path: '/family-doctor/consultations', icon: 'material-symbols:chat-outline', component: 'views/family-doctor/consultations/index', permission: 'family-doctor:consultation:view', parentId: familyDoctorMenu.id, order: 2 },
    { id: 36, name: 'Agent 调试', path: '/family-doctor/agent-debug', icon: 'material-symbols:account-tree-outline', component: 'views/family-doctor/agent-debug/index', permission: 'family-doctor:consultation:view', parentId: familyDoctorMenu.id, order: 3 },
    { id: 35, name: 'App 用户', path: '/family-doctor/app-users', icon: 'material-symbols:supervised-user-circle-outline', component: 'views/family-doctor/app-users/index', permission: 'family-doctor:app-user:view', parentId: familyDoctorMenu.id, order: 4 },
    { id: 33, name: '家庭管理', path: '/family-doctor/households', icon: 'material-symbols:home-health-outline', component: 'views/family-doctor/households/index', permission: 'family-doctor:household:view', parentId: familyDoctorMenu.id, order: 5 },
    { id: 34, name: '家庭药箱', path: '/family-doctor/household-medicines', icon: 'material-symbols:medication-outline', component: 'views/family-doctor/household-medicines/index', permission: 'family-doctor:household-medicine:view', parentId: familyDoctorMenu.id, order: 6 },
  ];

  for (const item of familyDoctorMenuItems) {
    await prisma.menu.upsert({
      where: { id: item.id },
      update: {
        ...item,
        type: 'menu',
        hidden: false,
      },
      create: {
        ...item,
        type: 'menu',
      },
    });
  }

  const permissionItems = [
    { id: 100, name: '新增用户', permission: 'system:user:create', parentId: 10, order: 1 },
    { id: 101, name: '编辑用户', permission: 'system:user:update', parentId: 10, order: 2 },
    { id: 102, name: '删除用户', permission: 'system:user:delete', parentId: 10, order: 3 },
    { id: 103, name: '分配用户角色', permission: 'system:user:assign-roles', parentId: 10, order: 4 },
    { id: 104, name: '导出用户', permission: 'system:user:export', parentId: 10, order: 5 },
    { id: 105, name: '批量删除用户', permission: 'system:user:batch-delete', parentId: 10, order: 6 },
    { id: 110, name: '新增角色', permission: 'system:role:create', parentId: 11, order: 1 },
    { id: 111, name: '编辑角色', permission: 'system:role:update', parentId: 11, order: 2 },
    { id: 112, name: '删除角色', permission: 'system:role:delete', parentId: 11, order: 3 },
    { id: 113, name: '分配角色权限', permission: 'system:role:assign-menus', parentId: 11, order: 4 },
    { id: 114, name: '导出角色', permission: 'system:role:export', parentId: 11, order: 5 },
    { id: 115, name: '批量删除角色', permission: 'system:role:batch-delete', parentId: 11, order: 6 },
    { id: 120, name: '新增菜单', permission: 'system:menu:create', parentId: 12, order: 1 },
    { id: 121, name: '编辑菜单', permission: 'system:menu:update', parentId: 12, order: 2 },
    { id: 122, name: '删除菜单', permission: 'system:menu:delete', parentId: 12, order: 3 },
    { id: 123, name: '导出菜单', permission: 'system:menu:export', parentId: 12, order: 4 },
    { id: 124, name: '批量删除菜单', permission: 'system:menu:batch-delete', parentId: 12, order: 5 },
    { id: 130, name: '更新系统配置', permission: 'system:setting:update', parentId: 13, order: 1 },
    { id: 140, name: '新增字典类型', permission: 'system:dictionary:create', parentId: 16, order: 1 },
    { id: 141, name: '编辑字典类型', permission: 'system:dictionary:update', parentId: 16, order: 2 },
    { id: 142, name: '删除字典类型', permission: 'system:dictionary:delete', parentId: 16, order: 3 },
    { id: 143, name: '新增字典项', permission: 'system:dictionary:item:create', parentId: 16, order: 4 },
    { id: 144, name: '编辑字典项', permission: 'system:dictionary:item:update', parentId: 16, order: 5 },
    { id: 145, name: '删除字典项', permission: 'system:dictionary:item:delete', parentId: 16, order: 6 },
    { id: 300, name: '新增药品', permission: 'family-doctor:medicine:create', parentId: 31, order: 1 },
    { id: 301, name: '编辑药品', permission: 'family-doctor:medicine:update', parentId: 31, order: 2 },
    { id: 302, name: '删除药品', permission: 'family-doctor:medicine:delete', parentId: 31, order: 3 },
    { id: 303, name: '更新家庭药箱', permission: 'family-doctor:household-medicine:update', parentId: 34, order: 1 },
    { id: 304, name: '删除家庭药箱', permission: 'family-doctor:household-medicine:delete', parentId: 34, order: 2 },
    { id: 305, name: '启停 App 用户', permission: 'family-doctor:app-user:update', parentId: 35, order: 1 },
    { id: 306, name: '重置 App 用户密码', permission: 'family-doctor:app-user:reset-password', parentId: 35, order: 2 },
    { id: 307, name: '删除 App 用户', permission: 'family-doctor:app-user:delete', parentId: 35, order: 3 },
    { id: 308, name: '删除家庭', permission: 'family-doctor:household:delete', parentId: 33, order: 1 },
    { id: 309, name: '删除问诊日志', permission: 'family-doctor:consultation:delete', parentId: 32, order: 1 },
  ];

  for (const item of permissionItems) {
    await prisma.menu.upsert({
      where: { id: item.id },
      update: {
        ...item,
        path: null,
        icon: null,
        component: null,
        redirect: null,
        hidden: true,
        type: 'button',
      },
      create: {
        ...item,
        hidden: true,
        type: 'button',
      },
    });
  }

  console.log('✅ 基础菜单创建完成: 系统管理 + 7 个子菜单 + 按钮权限');

  const commonStatusType = await prisma.dictionaryType.upsert({
    where: { code: 'common_status' },
    update: {
      name: '通用状态',
      description: '通用启用/停用状态',
      isEnabled: true,
      sort: 1,
      deletedAt: null,
    },
    create: {
      name: '通用状态',
      code: 'common_status',
      description: '通用启用/停用状态',
      isEnabled: true,
      sort: 1,
    },
  });

  const booleanFlagType = await prisma.dictionaryType.upsert({
    where: { code: 'boolean_flag' },
    update: {
      name: '是否标识',
      description: '通用是否选项',
      isEnabled: true,
      sort: 2,
      deletedAt: null,
    },
    create: {
      name: '是否标识',
      code: 'boolean_flag',
      description: '通用是否选项',
      isEnabled: true,
      sort: 2,
    },
  });

  const seedDictionaryItem = async (
    typeId: number,
    item: {
      label: string;
      value: string;
      color?: string;
      sort: number;
      remark?: string;
    },
  ) => {
    const existing = await prisma.dictionaryItem.findFirst({
      where: { typeId, value: item.value },
    });

    if (existing) {
      await prisma.dictionaryItem.update({
        where: { id: existing.id },
        data: {
          ...item,
          isEnabled: true,
          deletedAt: null,
        },
      });
      return;
    }

    await prisma.dictionaryItem.create({
      data: {
        typeId,
        ...item,
        isEnabled: true,
      },
    });
  };

  await seedDictionaryItem(commonStatusType.id, {
    label: '启用',
    value: 'enabled',
    color: '#18a058',
    sort: 1,
  });
  await seedDictionaryItem(commonStatusType.id, {
    label: '停用',
    value: 'disabled',
    color: '#d03050',
    sort: 2,
  });
  await seedDictionaryItem(booleanFlagType.id, {
    label: '是',
    value: 'true',
    color: '#2080f0',
    sort: 1,
  });
  await seedDictionaryItem(booleanFlagType.id, {
    label: '否',
    value: 'false',
    color: '#8a8a8a',
    sort: 2,
  });

  console.log('✅ 数据字典初始化完成: 通用状态 + 是否标识');

  await prisma.systemSetting.upsert({
    where: { key: 'app_registration_policy' },
    update: {
      name: 'App 注册码策略',
      value: {
        code: 'REG2026',
        enabled: true,
        maxActivations: 100,
        usedActivations: 0,
        expiresAt: '2099-12-31T23:59:59+08:00',
      },
      category: 'app',
      description: 'App 用户注册时校验的系统注册码、激活上限和有效期',
    },
    create: {
      key: 'app_registration_policy',
      name: 'App 注册码策略',
      value: {
        code: 'REG2026',
        enabled: true,
        maxActivations: 100,
        usedActivations: 0,
        expiresAt: '2099-12-31T23:59:59+08:00',
      },
      category: 'app',
      description: 'App 用户注册时校验的系统注册码、激活上限和有效期',
    },
  });

  console.log('✅ App 注册码策略初始化完成: REG2026');

  const medicineSeeds = [
    {
      id: 'med-ibu',
      name: '布洛芬缓释胶囊',
      aliases: ['布洛芬', '退烧药', '止痛药'],
      otc: 'OTC',
      indication: '头痛、发热、肌肉酸痛的短期缓解',
      contraindication: '胃溃疡、消化道出血史、孕晚期人群慎用',
      adverseReaction: '可能出现胃部不适、恶心、头晕',
      dosage: '请按说明书或药师指导使用',
      barcode: '6901234567890',
      approvalNumber: '国药准字示例-布洛芬',
    },
    {
      id: 'med-lhqw',
      name: '连花清瘟胶囊',
      aliases: ['连花清瘟', '上呼吸道不适'],
      otc: 'OTC',
      indication: '发热、咳嗽、咽干咽痛等上呼吸道不适',
      contraindication: '风寒感冒者、孕妇及脾胃虚寒者慎用',
      adverseReaction: '偶见腹泻、胃胀、皮疹',
      dosage: '请按说明书或药师指导使用',
      barcode: '6923456789012',
      approvalNumber: '国药准字示例-连花清瘟',
    },
    {
      id: 'med-amx',
      name: '阿莫西林胶囊',
      aliases: ['阿莫西林', '抗生素'],
      otc: 'RX',
      indication: '细菌感染相关炎症的处方用药',
      contraindication: '青霉素过敏人群禁用',
      adverseReaction: '可能出现皮疹、腹泻、恶心',
      dosage: '处方药，请遵医嘱使用',
      barcode: '6945678901234',
      approvalNumber: '国药准字示例-阿莫西林',
    },
    {
      id: 'med-hxzq',
      name: '藿香正气水',
      aliases: ['藿香正气', '胃肠型感冒'],
      otc: 'OTC',
      indication: '腹泻、恶心、胃肠型感冒不适',
      contraindication: '酒精敏感者、儿童及孕妇慎用',
      adverseReaction: '可能出现口干、轻度胃部刺激',
      dosage: '请按说明书或药师指导使用',
      barcode: '6956789012345',
      approvalNumber: '国药准字示例-藿香正气水',
    },
  ];

  for (const item of medicineSeeds) {
    await prisma.$executeRaw`
      INSERT INTO medicine_catalog (
        id,
        name,
        aliases,
        otc,
        indication,
        contraindication,
        adverse_reaction,
        dosage,
        barcode,
        approval_number
      )
      VALUES (
        ${item.id},
        ${item.name},
        ${item.aliases},
        ${item.otc}::"OtcType",
        ${item.indication},
        ${item.contraindication},
        ${item.adverseReaction},
        ${item.dosage},
        ${item.barcode},
        ${item.approvalNumber}
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        aliases = EXCLUDED.aliases,
        otc = EXCLUDED.otc,
        indication = EXCLUDED.indication,
        contraindication = EXCLUDED.contraindication,
        adverse_reaction = EXCLUDED.adverse_reaction,
        dosage = EXCLUDED.dosage,
        barcode = EXCLUDED.barcode,
        approval_number = EXCLUDED.approval_number,
        updated_at = now()
    `;
  }

  console.log('✅ 家庭医生药品种子数据初始化完成:', medicineSeeds.length, '条');

  const inventorySeeds = [
    {
      id: 'inv-local-dev-med-ibu',
      devUserId: 'local-dev',
      medicineId: 'med-ibu',
      quantity: 1,
      expireAt: '2026-12-31',
      source: '手动录入',
      notes: '家庭常备退热止痛药',
    },
    {
      id: 'inv-local-dev-med-lhqw',
      devUserId: 'local-dev',
      medicineId: 'med-lhqw',
      quantity: 1,
      expireAt: '2025-11-20',
      source: '图片识别',
      notes: '示例库存',
    },
    {
      id: 'inv-local-dev-med-hxzq',
      devUserId: 'local-dev',
      medicineId: 'med-hxzq',
      quantity: 2,
      expireAt: '2026-08-05',
      source: '条码录入',
      notes: '胃肠不适常备用药',
    },
  ];

  for (const item of inventorySeeds) {
    await prisma.$executeRaw`
      INSERT INTO user_medicine_inventory (
        id,
        dev_user_id,
        medicine_id,
        quantity,
        expire_at,
        source,
        notes
      )
      VALUES (
        ${item.id},
        ${item.devUserId},
        ${item.medicineId},
        ${item.quantity},
        ${item.expireAt}::date,
        ${item.source},
        ${item.notes}
      )
      ON CONFLICT (dev_user_id, medicine_id) DO UPDATE SET
        quantity = EXCLUDED.quantity,
        expire_at = EXCLUDED.expire_at,
        source = EXCLUDED.source,
        notes = EXCLUDED.notes,
        updated_at = now()
    `;
  }

  console.log('✅ local-dev 家庭药箱种子数据初始化完成:', inventorySeeds.length, '条');

  await prisma.$executeRaw`
    INSERT INTO app_user (
      id,
      username,
      password_hash,
      nickname,
      status
    )
    VALUES (
      'local-dev-user',
      'local-dev',
      ${hashedPassword},
      '本地示例用户',
      'active'
    )
    ON CONFLICT (id) DO UPDATE SET
      username = EXCLUDED.username,
      password_hash = EXCLUDED.password_hash,
      nickname = EXCLUDED.nickname,
      status = EXCLUDED.status,
      deleted_at = NULL,
      updated_at = now()
  `;

  await prisma.$executeRaw`
    INSERT INTO household (
      id,
      name,
      code,
      owner_user_id
    )
    VALUES (
      'local-dev-household',
      '本地示例家庭',
      'FAD001',
      'local-dev-user'
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      code = EXCLUDED.code,
      owner_user_id = EXCLUDED.owner_user_id,
      deleted_at = NULL,
      updated_at = now()
  `;

  await prisma.$executeRaw`
    UPDATE app_user
    SET default_household_id = 'local-dev-household',
        updated_at = now()
    WHERE id = 'local-dev-user'
  `;

  await prisma.$executeRaw`
    INSERT INTO household_member (
      id,
      household_id,
      user_id,
      role,
      display_name
    )
    VALUES (
      'local-dev-household-owner',
      'local-dev-household',
      'local-dev-user',
      'owner',
      '本地示例用户'
    )
    ON CONFLICT (id) DO UPDATE SET
      household_id = EXCLUDED.household_id,
      user_id = EXCLUDED.user_id,
      role = EXCLUDED.role,
      display_name = EXCLUDED.display_name,
      deleted_at = NULL
  `;

  for (const item of inventorySeeds) {
    await prisma.$executeRaw`
      INSERT INTO household_medicine_inventory (
        id,
        household_id,
        medicine_id,
        name,
        aliases,
        otc,
        indication,
        contraindication,
        adverse_reaction,
        dosage,
        barcode,
        approval_number,
        quantity,
        expire_at,
        source,
        notes,
        created_by
      )
      SELECT
        ${`hh-${item.id}`},
        'local-dev-household',
        m.id,
        m.name,
        m.aliases,
        m.otc,
        m.indication,
        m.contraindication,
        m.adverse_reaction,
        m.dosage,
        m.barcode,
        m.approval_number,
        ${item.quantity},
        ${item.expireAt}::date,
        ${item.source},
        ${item.notes},
        'local-dev-user'
      FROM medicine_catalog m
      WHERE m.id = ${item.medicineId}
      ON CONFLICT (id) DO UPDATE SET
        household_id = EXCLUDED.household_id,
        medicine_id = EXCLUDED.medicine_id,
        name = EXCLUDED.name,
        aliases = EXCLUDED.aliases,
        otc = EXCLUDED.otc,
        indication = EXCLUDED.indication,
        contraindication = EXCLUDED.contraindication,
        adverse_reaction = EXCLUDED.adverse_reaction,
        dosage = EXCLUDED.dosage,
        barcode = EXCLUDED.barcode,
        approval_number = EXCLUDED.approval_number,
        quantity = EXCLUDED.quantity,
        expire_at = EXCLUDED.expire_at,
        source = EXCLUDED.source,
        notes = EXCLUDED.notes,
        created_by = EXCLUDED.created_by,
        deleted_at = NULL,
        updated_at = now()
    `;
  }

  console.log('✅ household 本地示例家庭数据初始化完成');

  // 4. 给管理员角色分配所有菜单
  const allMenus = await prisma.menu.findMany();
  await prisma.role.update({
    where: { id: adminRole.id },
    data: {
      menus: {
        set: allMenus.map((m) => ({ id: m.id })),
      },
    },
  });

  console.log('✅ 管理员角色已分配所有菜单权限');
  console.log('');
  console.log('🎉 初始化完成！');
  console.log('   登录账号: admin');
  console.log('   登录密码: 123456');
}

main()
  .catch((e) => {
    console.error('❌ 初始化失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
