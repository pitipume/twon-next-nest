import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Ebook, EbookDocument } from '../schemas/ebook.schema';
import { TarotDeck, TarotDeckDocument } from '../schemas/tarot-deck.schema';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { ProductType } from '@prisma/client';

export interface ProductListItem {
  id: string;
  mongoRefId: string;
  productType: ProductType;
  title: string;
  priceTHB: number;
  coverImageUrl: string;
  categories?: string[];
  cardCount?: number;
  language?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

@Injectable()
export class CatalogRepository {
  constructor(
    @InjectModel(Ebook.name) private readonly ebookModel: Model<EbookDocument>,
    @InjectModel(TarotDeck.name) private readonly tarotModel: Model<TarotDeckDocument>,
    private readonly prisma: PrismaService,
  ) {}

  // ─── Product list (mixed — from Prisma for price/type, Mongo for content) ─

  async findPublishedProducts(
    type?: ProductType,
    pagination?: PaginationParams,
  ): Promise<{ items: ProductListItem[]; total: number }> {
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 20;
    const skip = (page - 1) * limit;

    const [products, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where: { isPublished: true, ...(type && { productType: type }) },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.product.count({
        where: { isPublished: true, ...(type && { productType: type }) },
      }),
    ]);

    // Enrich with MongoDB content data
    const items = await Promise.all(
      products.map(async (p) => {
        const content = await this.findContentByMongoId(p.mongoRefId, p.productType);
        const isEbook = p.productType === ProductType.EBOOK;
        const ebookContent = isEbook ? (content as unknown as Ebook) : null;
        const tarotContent = !isEbook ? (content as unknown as TarotDeck) : null;

        return {
          id: p.id,
          mongoRefId: p.mongoRefId,
          productType: p.productType,
          title: p.title,
          priceTHB: Number(p.priceTHB),
          coverImageUrl: content?.coverImageUrl ?? '',
          ...(isEbook && {
            categories: ebookContent?.categories,
            language: ebookContent?.language,
          }),
          ...(!isEbook && {
            cardCount: tarotContent?.cardCount,
          }),
        };
      }),
    );

    return { items, total };
  }

  // ─── Ebook ────────────────────────────────────────────────────────────────

  async findEbookByMongoId(mongoId: string): Promise<EbookDocument | null> {
    return this.ebookModel.findById(mongoId).exec();
  }

  async findEbookByProductId(postgresProductId: string): Promise<EbookDocument | null> {
    return this.ebookModel.findOne({ postgresProductId }).exec();
  }

  async createEbook(data: Partial<Ebook>): Promise<EbookDocument> {
    return this.ebookModel.create(data);
  }

  // ─── Tarot Deck ───────────────────────────────────────────────────────────

  async findTarotDeckByMongoId(mongoId: string): Promise<TarotDeckDocument | null> {
    return this.tarotModel.findById(mongoId).exec();
  }

  async findTarotDeckByProductId(postgresProductId: string): Promise<TarotDeckDocument | null> {
    return this.tarotModel.findOne({ postgresProductId }).exec();
  }

  async createTarotDeck(data: Partial<TarotDeck>): Promise<TarotDeckDocument> {
    return this.tarotModel.create(data);
  }

  async updateEbookById(id: string, data: Partial<Ebook>): Promise<void> {
    await this.ebookModel.findByIdAndUpdate(id, data).exec();
  }

  async updateTarotDeckById(id: string, data: Partial<TarotDeck>): Promise<void> {
    await this.tarotModel.findByIdAndUpdate(id, data).exec();
  }

  async setEbookPublishedByProductId(postgresProductId: string, isPublished: boolean): Promise<void> {
    await this.ebookModel.findOneAndUpdate(
      { postgresProductId },
      { isPublished, ...(isPublished && { publishedAt: new Date() }) },
    ).exec();
  }

  async setTarotDeckPublishedByProductId(postgresProductId: string, isPublished: boolean): Promise<void> {
    await this.tarotModel.findOneAndUpdate(
      { postgresProductId },
      { isPublished, ...(isPublished && { publishedAt: new Date() }) },
    ).exec();
  }

  // ─── Prisma product record ────────────────────────────────────────────────

  async findProductById(id: string) {
    return this.prisma.product.findUnique({ where: { id } });
  }

  async findProductByMongoRefId(mongoRefId: string) {
    return this.prisma.product.findUnique({ where: { mongoRefId } });
  }

  // ─── Private ─────────────────────────────────────────────────────────────

  private async findContentByMongoId(mongoRefId: string, type: ProductType) {
    if (type === ProductType.EBOOK) return this.ebookModel.findById(mongoRefId).lean().exec();
    if (type === ProductType.TAROT_DECK) return this.tarotModel.findById(mongoRefId).lean().exec();
    return null;
  }
}
