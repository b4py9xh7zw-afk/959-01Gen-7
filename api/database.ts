import type {
  User,
  Software,
  Seat,
  Application,
  QueueItem,
  License,
  UsageLog,
} from '../shared/types';
import { generateAllMockData } from '../shared/mockData';

class Database {
  private static instance: Database;
  public users: User[] = [];
  public softwareList: Software[] = [];
  public seats: Seat[] = [];
  public applications: Application[] = [];
  public queueItems: QueueItem[] = [];
  public licenses: License[] = [];
  public usageLogs: UsageLog[] = [];

  private constructor() {
    this.initialize();
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  private initialize(): void {
    const mockData = generateAllMockData();
    this.users = mockData.users;
    this.softwareList = mockData.softwareList;
    this.seats = mockData.seats;
    this.applications = mockData.applications;
    this.queueItems = mockData.queueItems;
    this.licenses = mockData.licenses;
    this.usageLogs = mockData.usageLogs;
  }

  public generateId(prefix: string): string {
    return `${prefix}_${Math.random().toString(36).substring(2, 11)}`;
  }
}

export const db = Database.getInstance();
