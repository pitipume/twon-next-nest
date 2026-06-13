import { Injectable } from '@nestjs/common';
import { LibraryService } from '../services/library.service';

@Injectable()
export class LibraryManager {
  constructor(private readonly service: LibraryService) {}

  async getLibrary(userId: string, role: string) {
    if (role === 'ADMIN') {
      const products = await this.service.getAllProductsForAdmin();
      return products.map((p) => ({
        id: p.id,
        productId: p.id,
        product: { ...p, priceTHB: Number(p.priceTHB) },
        grantedAt: p.createdAt,
      }));
    }

    if (role === 'MERCHANT') {
      const products = await this.service.getCreatedProducts(userId);
      return products.map((p) => ({
        id: p.id,
        productId: p.id,
        product: { ...p, priceTHB: Number(p.priceTHB) },
        grantedAt: p.createdAt,
      }));
    }

    const items = await this.service.getUserLibraryEnriched(userId);
    return items.map((item) => ({
      id: item.id,
      productId: item.productId,
      product: { ...item.product, priceTHB: Number(item.product.priceTHB) },
      grantedAt: item.grantedAt,
    }));
  }

  // ADMIN: bypass all checks. MERCHANT: free access to their own uploads. CUSTOMER: must own.
  private async canAccess(userId: string, role: string, productId: string): Promise<boolean> {
    if (role === 'ADMIN') return true;
    if (role === 'MERCHANT') return this.service.userCreatedProduct(userId, productId);
    return this.service.userOwnsProduct(userId, productId);
  }

  async getEbookSession(userId: string, role: string, productId: string) {
    const allowed = await this.canAccess(userId, role, productId);
    if (!allowed) return { success: false, message: 'You do not own this ebook.' } as const;

    const session = await this.service.getEbookSession(userId, productId);
    if (!session) return { success: false, message: 'Ebook not found.' } as const;

    return { success: true, data: session } as const;
  }

  async getTarotSession(userId: string, role: string, productId: string) {
    const allowed = await this.canAccess(userId, role, productId);
    if (!allowed) return { success: false, message: 'You do not own this tarot deck.' } as const;

    const session = await this.service.getTarotSession(userId, productId);
    if (!session) return { success: false, message: 'Tarot deck not found.' } as const;

    return { success: true, data: session } as const;
  }

  async saveProgress(
    userId: string,
    role: string,
    productId: string,
    currentPage: number,
    totalPages: number,
  ) {
    const allowed = await this.canAccess(userId, role, productId);
    if (!allowed) return { success: false, message: 'You do not own this ebook.' } as const;

    await this.service.saveReadingProgress(userId, productId, currentPage, totalPages);
    return { success: true } as const;
  }
}
