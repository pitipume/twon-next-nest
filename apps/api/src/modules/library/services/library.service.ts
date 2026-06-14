import { Injectable } from '@nestjs/common';
import { LibraryRepository } from '../repositories/library.repository';
import { CatalogRepository } from '../../catalog/repositories/catalog.repository';
import { StorageService } from '../../../infrastructure/storage/storage.service';
import { ProductType } from '@prisma/client';

const EBOOK_SESSION_TTL = 60 * 60 * 2;   // 2 hours
const TAROT_SESSION_TTL = 60 * 60 * 1;   // 1 hour

@Injectable()
export class LibraryService {
  constructor(
    private readonly repository: LibraryRepository,
    private readonly catalogRepository: CatalogRepository,
    private readonly storage: StorageService,
  ) {}

  async getUserLibrary(userId: string) {
    return this.repository.getUserLibrary(userId);
  }

  async userOwnsProduct(userId: string, productId: string): Promise<boolean> {
    return this.repository.userOwnsProduct(userId, productId);
  }

  private async signCoverUrl(raw: string): Promise<string> {
    if (!raw) return '';
    if (raw.startsWith('http')) return raw; // backward compat: old data stored full URL
    return this.storage.getSignedReadUrl(raw, 60 * 60 * 24); // 24h for thumbnails
  }

  private async enrichWithCovers<T extends { mongoRefId: string }>(products: T[]): Promise<(T & { coverImageUrl: string })[]> {
    if (!products.length) return products.map((p) => ({ ...p, coverImageUrl: '' }));
    const coverMap = await this.catalogRepository.findCoverImageUrls(products.map((p) => p.mongoRefId));
    return Promise.all(
      products.map(async (p) => ({
        ...p,
        coverImageUrl: await this.signCoverUrl(coverMap.get(p.mongoRefId) ?? ''),
      })),
    );
  }

  async getAllProductsForAdmin() {
    const products = await this.repository.getAllProducts();
    return this.enrichWithCovers(products);
  }

  async getCreatedProducts(userId: string) {
    const productIds = await this.catalogRepository.findProductIdsByCreator(userId);
    if (!productIds.length) return [];
    const products = await this.repository.getProductsByIds(productIds);
    return this.enrichWithCovers(products);
  }

  async getUserLibraryEnriched(userId: string) {
    const items = await this.repository.getUserLibrary(userId);
    if (!items.length) return items.map((i) => ({ ...i, product: { ...i.product, coverImageUrl: '' } }));
    const coverMap = await this.catalogRepository.findCoverImageUrls(items.map((i) => i.product.mongoRefId));
    return Promise.all(
      items.map(async (i) => ({
        ...i,
        product: {
          ...i.product,
          coverImageUrl: await this.signCoverUrl(coverMap.get(i.product.mongoRefId) ?? ''),
        },
      })),
    );
  }

  async userCreatedProduct(userId: string, productId: string): Promise<boolean> {
    const ebook = await this.catalogRepository.findEbookByProductId(productId);
    if (ebook) return ebook.createdBy === userId;
    const deck = await this.catalogRepository.findTarotDeckByProductId(productId);
    return deck?.createdBy === userId;
  }

  // ─── Ebook reading session ────────────────────────────────────────────────

  async getEbookSession(userId: string, productId: string) {
    const ebook = await this.catalogRepository.findEbookByProductId(productId);
    if (!ebook) return null;

    const [signedUrl, progress] = await Promise.all([
      this.storage.getSignedReadUrl(ebook.fileKey, EBOOK_SESSION_TTL),
      this.repository.getProgress(userId, productId),
    ]);

    return {
      pdfUrl: signedUrl,
      currentPage: progress?.currentPage ?? 1,
      totalPages: ebook.totalPages,
      percentComplete: progress?.percentComplete ?? 0,
      bookmarks: progress?.bookmarks ?? [],
      sessionExpiresIn: EBOOK_SESSION_TTL,
    };
  }

  async saveReadingProgress(
    userId: string,
    productId: string,
    currentPage: number,
    totalPages: number,
  ): Promise<void> {
    await this.repository.upsertProgress(userId, productId, currentPage, totalPages);
  }

  // ─── Tarot shuffle session ────────────────────────────────────────────────

  async getTarotSession(userId: string, productId: string) {
    const deck = await this.catalogRepository.findTarotDeckByProductId(productId);
    if (!deck) return null;

    // Generate signed URLs for every card + the card back image
    const [backUrl, cardUrls] = await Promise.all([
      this.storage.getSignedReadUrl(deck.backImageKey, TAROT_SESSION_TTL),
      Promise.all(
        deck.cards.map(async (card) => ({
          cardNumber: card.cardNumber,
          name: card.name,
          nameTh: card.nameTh,
          suit: card.suit,
          keywords: card.keywords,
          uprightMeaning: card.uprightMeaning,
          reversedMeaning: card.reversedMeaning,
          imageUrl: await this.storage.getSignedReadUrl(card.imageKey, TAROT_SESSION_TTL),
          // imageKey is intentionally NOT included — never expose storage paths
        })),
      ),
    ]);

    return {
      deckId: deck._id.toString(),
      deckName: deck.name,
      cardCount: deck.cardCount,
      backImageUrl: backUrl,
      cards: cardUrls,
      sessionExpiresIn: TAROT_SESSION_TTL,
    };
  }

  async grantAccess(userId: string, productId: string, orderId: string) {
    return this.repository.grantAccess(userId, productId, orderId);
  }

  async getProductType(productId: string): Promise<ProductType | null> {
    const product = await this.catalogRepository.findProductById(productId);
    return product?.productType ?? null;
  }
}
