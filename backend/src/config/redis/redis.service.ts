import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class RedisService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async get<T>(key: string): Promise<T | null> {
    const value = await this.cacheManager.get<T>(key);
    return value ?? null;
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    await this.cacheManager.set(key, value, ttl);
  }

  async del(key: string): Promise<void> {
    await this.cacheManager.del(key);
  }

  async reset(): Promise<void> {
    await (this.cacheManager as any).clear?.();
  }

  async keys(pattern?: string): Promise<string[]> {
    return [];
  }

  async exists(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }

  async setUserOnline(userId: string, socketId: string): Promise<void> {
    await this.set(`user:online:${userId}`, socketId, 3600);
  }

  async getUserOnline(userId: string): Promise<string | null> {
    return await this.get(`user:online:${userId}`);
  }

  async setUserOffline(userId: string): Promise<void> {
    await this.del(`user:online:${userId}`);
  }

  async addToRoom(userId: string, roomId: string): Promise<void> {
    await this.set(`user:room:${userId}`, roomId, 3600);
  }

  async getUserRoom(userId: string): Promise<string | null> {
    return await this.get(`user:room:${userId}`);
  }

  async incrementCounter(key: string): Promise<number> {
    const current = (await this.get<number>(key)) || 0;
    const newValue = current + 1;
    await this.set(key, newValue);
    return newValue;
  }

  async addToSet(key: string, value: string): Promise<void> {
    const set = (await this.get<string[]>(key)) || [];
    if (!set.includes(value)) {
      set.push(value);
      await this.set(key, set);
    }
  }

  async removeFromSet(key: string, value: string): Promise<void> {
    const set = (await this.get<string[]>(key)) || [];
    const filtered = set.filter((item) => item !== value);
    await this.set(key, filtered);
  }

  async getSet(key: string): Promise<string[]> {
    return (await this.get<string[]>(key)) || [];
  }
}
