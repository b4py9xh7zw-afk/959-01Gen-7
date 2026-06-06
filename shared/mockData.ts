import type {
  User,
  Software,
  Seat,
  Application,
  QueueItem,
  License,
  UsageLog,
} from './types';

const departments = [
  '计算机学院',
  '数学与统计学院',
  '物理学院',
  '化学学院',
  '生命科学学院',
  '机械工程学院',
  '电子信息学院',
];

const firstNames = ['张', '李', '王', '刘', '陈', '杨', '赵', '黄', '周', '吴'];
const lastNames = ['伟', '芳', '娜', '敏', '静', '丽', '强', '磊', '军', '洋', '勇', '艳', '杰', '娟', '涛'];

const softwareData = [
  { name: 'SPSS', category: 'statistics' as const, version: '29.0', vendor: 'IBM', price: 58000, seats: 15, avgHours: 12.5, icon: '📊' },
  { name: 'SAS', category: 'statistics' as const, version: '9.4', vendor: 'SAS Institute', price: 86000, seats: 10, avgHours: 18.3, icon: '📈' },
  { name: 'RStudio', category: 'statistics' as const, version: '2023.12', vendor: 'Posit', price: 12000, seats: 30, avgHours: 8.7, icon: '📉' },
  { name: 'Stata', category: 'statistics' as const, version: '18.0', vendor: 'StataCorp', price: 45000, seats: 12, avgHours: 15.2, icon: '🔢' },
  { name: 'MATLAB', category: 'simulation' as const, version: 'R2023b', vendor: 'MathWorks', price: 125000, seats: 20, avgHours: 22.8, icon: '🧮' },
  { name: 'Ansys', category: 'simulation' as const, version: '2024 R1', vendor: 'Ansys', price: 198000, seats: 8, avgHours: 28.5, icon: '🔬' },
  { name: 'COMSOL', category: 'simulation' as const, version: '6.2', vendor: 'COMSOL', price: 156000, seats: 6, avgHours: 24.1, icon: '⚗️' },
  { name: 'LabVIEW', category: 'simulation' as const, version: '2023 Q3', vendor: 'NI', price: 78000, seats: 10, avgHours: 16.9, icon: '🎛️' },
  { name: 'OriginPro', category: 'graphics' as const, version: '2024b', vendor: 'OriginLab', price: 32000, seats: 25, avgHours: 9.6, icon: '📐' },
  { name: 'Adobe Illustrator', category: 'graphics' as const, version: '28.0', vendor: 'Adobe', price: 28000, seats: 18, avgHours: 7.8, icon: '🎨' },
  { name: 'ChemDraw', category: 'graphics' as const, version: '22.0', vendor: 'PerkinElmer', price: 42000, seats: 15, avgHours: 11.4, icon: '⚛️' },
  { name: 'GraphPad Prism', category: 'graphics' as const, version: '10.0', vendor: 'GraphPad', price: 38000, seats: 20, avgHours: 10.2, icon: '📋' },
];

const courseNames = [
  '高级统计学',
  '数值分析',
  '机器学习',
  '计算物理',
  '量子化学',
  '生物信息学',
  '有限元分析',
  '控制系统仿真',
  '数据可视化',
  '科研绘图',
];

const projectNames = [
  '国家自然科学基金-面向大规模数据的高效学习算法研究',
  '科技部重点研发计划-新能源材料仿真与优化',
  '教育部博士点基金-复杂系统的多尺度建模',
  '省科技攻关项目-高性能计算在生物信息学中的应用',
  '校级科研创新团队-人工智能与数据科学',
  '横向合作项目-工业过程模拟与优化',
];

const purposes = [
  '用于课程作业和数据分析练习',
  '参与科研项目的数据处理和仿真计算',
  '毕业论文的数据统计与图表制作',
  '参加学科竞赛的数据分析支撑',
  '个人学术研究和论文写作',
  '课题组集体数据处理与建模分析',
];

function generateId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).substring(2, 11)}`;
}

function randomDate(start: Date, end: Date): string {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString();
}

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomName(): string {
  return randomItem(firstNames) + randomItem(lastNames);
}

export function generateMockUsers(): User[] {
  const users: User[] = [];

  for (let i = 0; i < 3; i++) {
    users.push({
      id: generateId('admin'),
      name: `管理员${i + 1}`,
      email: `admin${i + 1}@university.edu`,
      password: 'admin123',
      role: 'admin',
      department: '信息技术中心',
      employeeId: `ADM${String(1001 + i).padStart(6, '0')}`,
      status: 'active',
      createdAt: randomDate(new Date('2023-01-01'), new Date('2023-06-01')),
    });
  }

  for (let i = 0; i < 10; i++) {
    const name = randomName();
    users.push({
      id: generateId('teacher'),
      name,
      email: `${name.toLowerCase().replace(/\s/g, '')}${i + 1}@university.edu`,
      password: 'teacher123',
      role: 'teacher',
      department: randomItem(departments),
      employeeId: `EMP${String(2001 + i).padStart(6, '0')}`,
      status: 'active',
      enrollmentDate: randomDate(new Date('2015-01-01'), new Date('2020-01-01')),
      createdAt: randomDate(new Date('2023-01-01'), new Date('2023-06-01')),
    });
  }

  for (let i = 0; i < 50; i++) {
    const name = randomName();
    const isGraduated = i < 5;
    users.push({
      id: generateId('student'),
      name,
      email: `stu${String(20210001 + i)}@university.edu`,
      password: 'student123',
      role: 'student',
      department: randomItem(departments),
      studentId: `STU${String(20210001 + i).padStart(8, '0')}`,
      status: isGraduated ? 'graduated' : 'active',
      enrollmentDate: isGraduated ? '2019-09-01' : '2021-09-01',
      graduationDate: isGraduated ? '2023-06-30' : '2025-06-30',
      createdAt: randomDate(new Date('2023-01-01'), new Date('2024-01-01')),
    });
  }

  return users;
}

export function generateMockSoftware(): Software[] {
  const softwareList: Software[] = [];
  const now = new Date();

  softwareData.forEach((sw, index) => {
    const usedCount = Math.floor(sw.seats * (0.4 + Math.random() * 0.5));
    softwareList.push({
      id: generateId('sw'),
      name: sw.name,
      category: sw.category,
      version: sw.version,
      vendor: sw.vendor,
      description: `${sw.name}是一款专业的${sw.category === 'statistics' ? '统计分析' : sw.category === 'simulation' ? '数值仿真' : '科学绘图'}软件，广泛应用于学术研究和工程实践。支持大规模数据处理、高级建模和可视化输出，是科研工作者的必备工具。`,
      totalSeats: sw.seats,
      usedSeats: usedCount,
      price: sw.price,
      purchaseDate: randomDate(new Date('2023-01-01'), new Date('2023-12-01')),
      expirationDate: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()).toISOString(),
      icon: sw.icon,
      averageUsageHours: sw.avgHours,
      createdAt: randomDate(new Date('2023-01-01'), new Date('2023-06-01')),
    });
  });

  return softwareList;
}

export function generateMockSeats(softwareList: Software[]): Seat[] {
  const seats: Seat[] = [];

  softwareList.forEach((sw) => {
    for (let i = 0; i < sw.totalSeats; i++) {
      const isOccupied = i < sw.usedSeats;
      seats.push({
        id: generateId('seat'),
        softwareId: sw.id,
        licenseKey: `${sw.name.toUpperCase().replace(/\s/g, '')}-${String(i + 1).padStart(4, '0')}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        status: isOccupied ? 'occupied' : 'available',
        assignedAt: isOccupied ? randomDate(new Date('2024-01-01'), new Date('2024-06-01')) : undefined,
      });
    }
  });

  return seats;
}

export function generateMockApplications(users: User[], softwareList: Software[]): Application[] {
  const applications: Application[] = [];
  const activeUsers = users.filter((u) => u.status === 'active');
  const statuses: ('pending' | 'approved' | 'rejected')[] = ['pending', 'approved', 'rejected'];
  const types: ('course' | 'research' | 'personal')[] = ['course', 'research', 'personal'];

  for (let i = 0; i < 30; i++) {
    const user = randomItem(activeUsers);
    const sw = randomItem(softwareList);
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const type = types[Math.floor(Math.random() * types.length)];
    const startDate = randomDate(new Date('2024-01-01'), new Date('2024-07-01'));
    const endDate = new Date(new Date(startDate).getTime() + 30 * 24 * 60 * 60 * 1000 + Math.random() * 180 * 24 * 60 * 60 * 1000).toISOString();
    const createdAt = new Date(new Date(startDate).getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const approver = users.find((u) => u.role === 'admin' || u.role === 'teacher');

    applications.push({
      id: generateId('app'),
      userId: user.id,
      softwareId: sw.id,
      purpose: randomItem(purposes),
      type,
      courseName: type === 'course' ? randomItem(courseNames) : undefined,
      projectName: type === 'research' ? randomItem(projectNames) : undefined,
      department: user.department,
      startDate,
      endDate,
      status,
      approverId: status !== 'pending' ? approver?.id : undefined,
      rejectionReason: status === 'rejected' ? '申请用途与课程或科研项目关联不足，请补充详细说明。' : undefined,
      createdAt,
      approvedAt: status === 'approved' ? new Date(new Date(createdAt).getTime() + 1 * 24 * 60 * 60 * 1000).toISOString() : undefined,
    });
  }

  return applications;
}

export function generateMockLicenses(users: User[], softwareList: Software[], seats: Seat[], applications: Application[]): License[] {
  const licenses: License[] = [];
  const approvedApps = applications.filter((a) => a.status === 'approved');
  const occupiedSeats = seats.filter((s) => s.status === 'occupied');
  const activeUsers = users.filter((u) => u.status === 'active');

  for (let i = 0; i < 40; i++) {
    const app = approvedApps[i % approvedApps.length];
    const seat = occupiedSeats[i % occupiedSeats.length];
    const user = activeUsers[i % activeUsers.length];
    const sw = softwareList.find((s) => s.id === seat.softwareId);
    const status = i < 25 ? 'active' : i < 35 ? 'expired' : 'revoked';

    licenses.push({
      id: generateId('lic'),
      userId: user.id,
      softwareId: sw?.id || seat.softwareId,
      seatId: seat.id,
      applicationId: app.id,
      startDate: app.startDate,
      endDate: app.endDate,
      status,
      activatedAt: status === 'active' ? randomDate(new Date('2024-01-01'), new Date('2024-06-01')) : undefined,
      lastUsedAt: status === 'active' ? randomDate(new Date('2024-05-01'), new Date('2024-06-06')) : undefined,
      createdAt: app.createdAt,
    });
  }

  return licenses;
}

export function generateMockQueueItems(users: User[], softwareList: Software[], applications: Application[]): QueueItem[] {
  const queueItems: QueueItem[] = [];
  const activeUsers = users.filter((u) => u.status === 'active');
  const pendingApps = applications.filter((a) => a.status === 'pending');

  const popularSoftwareIds = softwareList.filter((sw) => sw.usedSeats >= sw.totalSeats * 0.7).slice(0, 3).map((s) => s.id);

  popularSoftwareIds.forEach((swId) => {
    const sw = softwareList.find((s) => s.id === swId)!;
    const queueLength = Math.floor(3 + Math.random() * 8);

    for (let i = 0; i < queueLength; i++) {
      const user = randomItem(activeUsers);
      const app = pendingApps.find((a) => a.softwareId === swId) || randomItem(pendingApps);
      const estimatedWaitTime = (i + 1) * sw.averageUsageHours;

      queueItems.push({
        id: generateId('queue'),
        userId: user.id,
        softwareId: swId,
        position: i + 1,
        estimatedWaitTime,
        joinedAt: randomDate(new Date('2024-06-01'), new Date('2024-06-06')),
        applicationId: app.id,
      });
    }
  });

  return queueItems;
}

export function generateMockUsageLogs(users: User[], softwareList: Software[], licenses: License[]): UsageLog[] {
  const usageLogs: UsageLog[] = [];
  const activeLicenses = licenses.filter((l) => l.status === 'active');
  const actions: ('activate' | 'deactivate' | 'checkout' | 'checkin')[] = ['activate', 'deactivate', 'checkout', 'checkin'];

  for (let i = 0; i < 100; i++) {
    const license = randomItem(activeLicenses);
    const action = actions[Math.floor(Math.random() * actions.length)];

    usageLogs.push({
      id: generateId('log'),
      userId: license.userId,
      softwareId: license.softwareId,
      licenseId: license.id,
      action,
      timestamp: randomDate(new Date('2024-01-01'), new Date('2024-06-06')),
      ipAddress: `10.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
    });
  }

  return usageLogs;
}

export function generateAllMockData() {
  const users = generateMockUsers();
  const softwareList = generateMockSoftware();
  const seats = generateMockSeats(softwareList);
  const applications = generateMockApplications(users, softwareList);
  const licenses = generateMockLicenses(users, softwareList, seats, applications);
  const queueItems = generateMockQueueItems(users, softwareList, applications);
  const usageLogs = generateMockUsageLogs(users, softwareList, licenses);

  return {
    users,
    softwareList,
    seats,
    applications,
    licenses,
    queueItems,
    usageLogs,
  };
}

export const testAccounts = {
  admin: { email: 'admin1@university.edu', password: 'admin123', name: '管理员1', role: 'admin' },
  teacher: { email: '王伟1@university.edu', password: 'teacher123', name: '王老师', role: 'teacher' },
  student: { email: 'stu20210001@university.edu', password: 'student123', name: '学生', role: 'student' },
};
