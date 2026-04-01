import { Injectable } from '@nestjs/common';
import { LibraryService } from '../services/library.service';

@Injectable()
export class LibraryManager {
  constructor(private readonly service: LibraryService) {}

  async getLibrary(userId: string) {
    const items = await this.service.getUserLibrary(userId);
    return items.map((item) => ({
      productId: item.productId,
      productType: item.product.productType,
      title: item.product.title,
      grantedAt: item.grantedAt,
    }));
  }

  async getEbookSession(userId: string, productId: string) {
    const owns = await this.service.userOwnsProduct(userId, productId);
    if (!owns) return { success: false, message: 'You do not own this ebook.' } as const;

    const session = await this.service.getEbookSession(userId, productId);
    if (!session) return { success: false, message: 'Ebook not found.' } as const;

    return { success: true, data: session } as const;
  }

  async getTarotSession(userId: string, productId: string) {
    const owns = await this.service.userOwnsProduct(userId, productId);
    if (!owns) return { success: false, message: 'You do not own this tarot deck.' } as const;

    const session = await this.service.getTarotSession(userId, productId);
    if (!session) return { success: false, message: 'Tarot deck not found.' } as const;

    return { success: true, data: session } as const;
  }

  async saveProgress(
    userId: string,
    productId: string,
    currentPage: number,
    totalPages: number,
  ) {
    const owns = await this.service.userOwnsProduct(userId, productId);
    if (!owns) return { success: false, message: 'You do not own this ebook.' } as const;

    await this.service.saveReadingProgress(userId, productId, currentPage, totalPages);
    return { success: true } as const;
  }
}
