import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { StorageService } from '../../../infrastructure/storage/storage.service';
import { CatalogRepository } from '../../catalog/repositories/catalog.repository';
import { ProductType } from '@prisma/client';
import AdmZip from 'adm-zip';
import sharp from 'sharp';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly catalog: CatalogRepository,
  ) {}

  // ─── Ebook upload ─────────────────────────────────────────────────────────

  async uploadEbook(params: {
    title: string;
    author: string;
    description: string;
    priceTHB: number;
    previewPages: number;
    language: string;
    categories: string[];
    tags: string[];
    adminId: string;
    pdfBuffer: Buffer;
    pdfOriginalName: string;
    coverBuffer?: Buffer;
  }) {
    // 1. Create the MongoDB ebook doc first (placeholder fileKey)
    const tempMongoId = 'temp';
    const ebook = await this.catalog.createEbook({
      title: params.title,
      author: params.author,
      description: params.description,
      coverImageUrl: '',
      fileKey: tempMongoId,
      totalPages: 0, // will update when we can count pages
      language: params.language,
      categories: params.categories,
      tags: params.tags,
      previewPages: params.previewPages,
      isPublished: false,
      createdBy: params.adminId,
    });

    const mongoId = ebook._id.toString();

    // 2. Upload PDF to R2
    const fileKey = this.storage.buildKey.ebookFile(mongoId, 'ebook.pdf');
    await this.storage.upload(fileKey, params.pdfBuffer, 'application/pdf');

    // 3. Upload cover image (if provided), convert to webp
    let coverImageUrl = '';
    if (params.coverBuffer) {
      const webpBuffer = await sharp(params.coverBuffer)
        .resize(400, 600, { fit: 'cover' })
        .webp({ quality: 85 })
        .toBuffer();
      const coverKey = this.storage.buildKey.ebookCover(mongoId);
      await this.storage.upload(coverKey, webpBuffer, 'image/webp');
      coverImageUrl = await this.storage.getSignedReadUrl(coverKey, 60 * 60 * 24 * 365);
    }

    // 4. Update ebook doc with real fileKey + coverImageUrl
    await this.catalog['ebookModel'].findByIdAndUpdate(mongoId, {
      fileKey,
      coverImageUrl,
    });

    // 5. Create Prisma product record (for pricing + catalog)
    const product = await this.prisma.product.create({
      data: {
        mongoRefId: mongoId,
        productType: ProductType.EBOOK,
        title: params.title,
        priceTHB: params.priceTHB,
        isPublished: false,
      },
    });

    // 6. Update Mongo doc with postgres product id
    await this.catalog['ebookModel'].findByIdAndUpdate(mongoId, {
      postgresProductId: product.id,
    });

    return { productId: product.id, mongoId };
  }

  // ─── Tarot deck upload (ZIP) ──────────────────────────────────────────────

  async uploadTarotDeck(params: {
    name: string;
    description: string;
    priceTHB: number;
    adminId: string;
    zipBuffer: Buffer;
    coverBuffer?: Buffer;
    backBuffer?: Buffer;
  }) {
    // 1. Create MongoDB deck doc (empty cards, will populate from ZIP)
    const deck = await this.catalog.createTarotDeck({
      name: params.name,
      description: params.description,
      coverImageUrl: '',
      backImageKey: '',
      cardCount: 0,
      isPublished: false,
      createdBy: params.adminId,
      cards: [],
    });

    const mongoId = deck._id.toString();

    // 2. Parse ZIP — expected naming: 00_the_fool.webp, 01_the_magician.webp...
    const zip = new AdmZip(params.zipBuffer);
    const entries = zip.getEntries()
      .filter((e) => !e.isDirectory && /\.(png|jpg|jpeg|webp)$/i.test(e.name))
      .sort((a, b) => a.name.localeCompare(b.name));

    this.logger.log(`Processing ${entries.length} card images from ZIP`);

    // 3. Upload each card image to R2 (convert to webp for consistency)
    const cards = await Promise.all(
      entries.map(async (entry, index) => {
        const raw = entry.getData();
        const webpBuffer = await sharp(raw)
          .resize(400, 700, { fit: 'cover' })
          .webp({ quality: 90 })
          .toBuffer();

        const cardKey = this.storage.buildKey.tarotCard(mongoId, index);
        await this.storage.upload(cardKey, webpBuffer, 'image/webp');

        // Parse card name from filename: "00_the_fool.webp" → "The Fool"
        const namePart = entry.name.replace(/^\d+_/, '').replace(/\.\w+$/, '');
        const cardName = namePart.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

        return {
          cardNumber: index,
          name: cardName,
          imageKey: cardKey,
          uprightMeaning: '',
          reversedMeaning: '',
          keywords: [],
          suit: 'major' as const,
        };
      }),
    );

    // 4. Upload cover + back images
    let coverImageUrl = '';
    let backImageKey = '';

    if (params.coverBuffer) {
      const webp = await sharp(params.coverBuffer).resize(400, 600, { fit: 'cover' }).webp({ quality: 85 }).toBuffer();
      const key = this.storage.buildKey.tarotCover(mongoId);
      await this.storage.upload(key, webp, 'image/webp');
      coverImageUrl = await this.storage.getSignedReadUrl(key, 60 * 60 * 24 * 365);
    }

    if (params.backBuffer) {
      const webp = await sharp(params.backBuffer).resize(400, 700, { fit: 'cover' }).webp({ quality: 85 }).toBuffer();
      backImageKey = this.storage.buildKey.tarotBack(mongoId);
      await this.storage.upload(backImageKey, webp, 'image/webp');
    }

    // 5. Update MongoDB deck with all card data
    await this.catalog['tarotModel'].findByIdAndUpdate(mongoId, {
      cards,
      cardCount: cards.length,
      coverImageUrl,
      backImageKey,
    });

    // 6. Create Prisma product record
    const product = await this.prisma.product.create({
      data: {
        mongoRefId: mongoId,
        productType: ProductType.TAROT_DECK,
        title: params.name,
        priceTHB: params.priceTHB,
        isPublished: false,
      },
    });

    await this.catalog['tarotModel'].findByIdAndUpdate(mongoId, {
      postgresProductId: product.id,
    });

    return { productId: product.id, mongoId, cardCount: cards.length };
  }

  // ─── Payment config ───────────────────────────────────────────────────────

  async setPaymentConfig(params: {
    bankName: string;
    accountName: string;
    accountNumber: string;
  }) {
    return this.prisma.paymentConfig.upsert({
      where: { id: 'singleton' },
      create: { id: 'singleton', ...params },
      update: params,
    });
  }

  async uploadPaymentQr(qrBuffer: Buffer, contentType: string) {
    const key = 'payment-config/qr.webp';
    // Convert any image to WebP for consistency
    const webpBuffer = await sharp(qrBuffer)
      .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 90 })
      .toBuffer();
    await this.storage.upload(key, webpBuffer, 'image/webp');

    await this.prisma.paymentConfig.upsert({
      where: { id: 'singleton' },
      create: { id: 'singleton', qrImageKey: key, bankName: '', accountName: '', accountNumber: '' },
      update: { qrImageKey: key },
    });

    return { qrImageKey: key };
  }

  // ─── Publish / Unpublish ──────────────────────────────────────────────────

  async setPublished(productId: string, isPublished: boolean) {
    const product = await this.prisma.product.update({
      where: { id: productId },
      data: { isPublished },
    });

    // Mirror to MongoDB
    if (product.productType === ProductType.EBOOK) {
      await this.catalog['ebookModel'].findOneAndUpdate(
        { postgresProductId: productId },
        { isPublished, ...(isPublished && { publishedAt: new Date() }) },
      );
    } else {
      await this.catalog['tarotModel'].findOneAndUpdate(
        { postgresProductId: productId },
        { isPublished, ...(isPublished && { publishedAt: new Date() }) },
      );
    }

    return product;
  }
}
