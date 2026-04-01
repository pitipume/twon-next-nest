import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { ReadingProgress, ReadingProgressDocument } from '../schemas/reading-progress.schema';

@Injectable()
export class LibraryRepository {
  constructor(
    @InjectModel(ReadingProgress.name)
    private readonly progressModel: Model<ReadingProgressDocument>,
    private readonly prisma: PrismaService,
  ) {}

  // ─── Ownership ────────────────────────────────────────────────────────────

  async userOwnsProduct(userId: string, productId: string): Promise<boolean> {
    const item = await this.prisma.libraryItem.findUnique({
      where: { userId_productId: { userId, productId } },
    });
    return item !== null;
  }

  async getUserLibrary(userId: string) {
    return this.prisma.libraryItem.findMany({
      where: { userId },
      include: { product: true },
      orderBy: { grantedAt: 'desc' },
    });
  }

  async grantAccess(userId: string, productId: string, orderId: string) {
    return this.prisma.libraryItem.upsert({
      where: { userId_productId: { userId, productId } },
      create: { userId, productId, orderId },
      update: {}, // already owned — no-op
    });
  }

  // ─── Reading Progress (MongoDB) ───────────────────────────────────────────

  async getProgress(userId: string, productId: string): Promise<ReadingProgressDocument | null> {
    return this.progressModel.findOne({ userId, productId }).exec();
  }

  async upsertProgress(
    userId: string,
    productId: string,
    currentPage: number,
    totalPages: number,
  ): Promise<void> {
    const percent = totalPages > 0 ? Math.round((currentPage / totalPages) * 100) : 0;

    await this.progressModel.findOneAndUpdate(
      { userId, productId },
      {
        $set: {
          currentPage,
          totalPages,
          percentComplete: percent,
          lastReadAt: new Date(),
        },
      },
      { upsert: true },
    );
  }
}
