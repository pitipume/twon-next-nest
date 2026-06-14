import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { StorageService } from '../../../infrastructure/storage/storage.service';
import { CatalogRepository } from '../../catalog/repositories/catalog.repository';
import { OrderStatus, ProductType } from '@prisma/client';
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

  // ─── Presigned upload URL generation ────────────────────────────────────

  async getEbookUploadUrls(uploadId: string) {
    const pdfKey = this.storage.buildKey.ebookFile(uploadId, 'ebook.pdf');
    const coverKey = this.storage.buildKey.ebookCover(uploadId);
    const TTL = 15 * 60; // 15 minutes to complete the upload

    const [pdfUrl, coverUrl] = await Promise.all([
      this.storage.getSignedUploadUrl(pdfKey, 'application/pdf', TTL),
      this.storage.getSignedUploadUrl(coverKey, 'image/webp', TTL),
    ]);

    return {
      pdf: { url: pdfUrl, key: pdfKey },
      cover: { url: coverUrl, key: coverKey },
    };
  }

  async getTarotUploadUrls(uploadId: string) {
    const zipKey = `tarot/uploads/${uploadId}.zip`;
    const coverKey = this.storage.buildKey.tarotCover(uploadId);
    const backKey = this.storage.buildKey.tarotBack(uploadId);
    const TTL = 15 * 60;

    const [zipUrl, coverUrl, backUrl] = await Promise.all([
      this.storage.getSignedUploadUrl(zipKey, 'application/zip', TTL),
      this.storage.getSignedUploadUrl(coverKey, 'image/webp', TTL),
      this.storage.getSignedUploadUrl(backKey, 'image/webp', TTL),
    ]);

    return {
      zip: { url: zipUrl, key: zipKey },
      cover: { url: coverUrl, key: coverKey },
      back: { url: backUrl, key: backKey },
    };
  }

  // ─── Ebook upload (confirm after direct R2 upload) ────────────────────────

  async uploadEbook(params: {
    title: string;
    author: string;
    description?: string;
    priceTHB: number;
    previewPages: number;
    language: string;
    categories: string[];
    tags: string[];
    userId: string;
    pdfKey: string;
    coverKey?: string;
    totalPages?: number;
  }) {
    // 1. Create MongoDB ebook doc with the R2 keys (files already uploaded by client)
    const ebook = await this.catalog.createEbook({
      title: params.title,
      author: params.author,
      description: params.description ?? '',
      coverImageUrl: params.coverKey ?? '',
      fileKey: params.pdfKey,
      totalPages: params.totalPages ?? 0,
      language: params.language,
      categories: params.categories,
      tags: params.tags,
      previewPages: params.previewPages,
      isPublished: false,
      createdBy: params.userId,
    });

    const mongoId = ebook._id.toString();

    // 2. Create Prisma product record
    const product = await this.prisma.product.create({
      data: {
        mongoRefId: mongoId,
        productType: ProductType.EBOOK,
        title: params.title,
        priceTHB: params.priceTHB,
        isPublished: false,
        uploadedBy: params.userId,
      },
    });

    // 3. Link Postgres product ID back to MongoDB
    await this.catalog.updateEbookById(mongoId, { postgresProductId: product.id });

    return { productId: product.id, mongoId };
  }

  // ─── Tarot deck upload (ZIP downloaded from R2, processed server-side) ────

  async uploadTarotDeck(params: {
    name: string;
    description?: string;
    priceTHB: number;
    userId: string;
    zipKey: string;
    coverKey?: string;
    backKey?: string;
  }) {
    // 1. Create MongoDB deck doc (empty cards, will populate from ZIP)
    const deck = await this.catalog.createTarotDeck({
      name: params.name,
      description: params.description ?? '',
      coverImageUrl: params.coverKey ?? '',
      backImageKey: params.backKey ?? '',
      cardCount: 0,
      isPublished: false,
      createdBy: params.userId,
      cards: [],
    });

    const mongoId = deck._id.toString();

    // 2. Download ZIP from R2 (client uploaded it directly)
    this.logger.log(`Downloading ZIP from R2: ${params.zipKey}`);
    const zipBuffer = await this.storage.download(params.zipKey);

    // 3. Delete the temporary ZIP (no longer needed after download)
    await this.storage.delete(params.zipKey);

    // 4. Parse ZIP — expected naming: 00_the_fool.webp, 01_the_magician.webp...
    const zip = new AdmZip(zipBuffer);
    const entries = zip.getEntries()
      .filter((e) => !e.isDirectory && /\.(png|jpg|jpeg|webp)$/i.test(e.name))
      .sort((a, b) => a.name.localeCompare(b.name));

    this.logger.log(`Processing ${entries.length} card images from ZIP`);

    // 5. Upload each card image to R2 (convert to webp for consistency)
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

    // 6. Update MongoDB deck with all card data
    await this.catalog.updateTarotDeckById(mongoId, {
      cards,
      cardCount: cards.length,
    });

    // 7. Create Prisma product record
    const product = await this.prisma.product.create({
      data: {
        mongoRefId: mongoId,
        productType: ProductType.TAROT_DECK,
        title: params.name,
        priceTHB: params.priceTHB,
        isPublished: false,
        uploadedBy: params.userId,
      },
    });

    await this.catalog.updateTarotDeckById(mongoId, { postgresProductId: product.id });

    return { productId: product.id, mongoId, cardCount: cards.length };
  }

  // ─── Payment config ───────────────────────────────────────────────────────

  async getPaymentConfig() {
    const config = await this.prisma.paymentConfig.findUnique({ where: { id: 'singleton' } });
    if (!config?.qrImageKey) return config;
    const qrImageUrl = await this.storage.getSignedReadUrl(config.qrImageKey, 60 * 60);
    return { ...config, qrImageUrl };
  }

  async getAllProducts(merchantId?: string) {
    return this.prisma.product.findMany({
      where: {
        isDeleted: false,
        ...(merchantId ? { uploadedBy: merchantId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        productType: true,
        priceTHB: true,
        isPublished: true,
        createdAt: true,
        uploader: { select: { id: true, displayName: true } },
      },
    });
  }

  async setPaymentConfig(params: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    commissionRate?: number;
  }) {
    const data = params.commissionRate !== undefined
      ? params
      : { bankName: params.bankName, accountName: params.accountName, accountNumber: params.accountNumber };
    return this.prisma.paymentConfig.upsert({
      where: { id: 'singleton' },
      create: { id: 'singleton', ...data },
      update: data,
    });
  }

  async getMerchantEarnings(merchantId?: string) {
    const items = await this.prisma.orderItem.findMany({
      where: {
        order: { status: OrderStatus.COMPLETED },
        product: merchantId
          ? { uploadedBy: merchantId }          // merchant: own products only
          : { uploadedBy: { not: null } },      // admin: all merchants
      },
      include: {
        product: {
          include: {
            uploader: { select: { id: true, displayName: true, email: true } },
          },
        },
      },
    });

    const byMerchant = new Map<string, {
      merchantId: string;
      displayName: string;
      email: string;
      itemCount: number;
      grossTHB: number;
      commissionTHB: number;
      netTHB: number;
    }>();

    for (const item of items) {
      const merchantId = item.product.uploadedBy!;
      if (!byMerchant.has(merchantId)) {
        byMerchant.set(merchantId, {
          merchantId,
          displayName: item.product.uploader!.displayName,
          email: item.product.uploader!.email,
          itemCount: 0,
          grossTHB: 0,
          commissionTHB: 0,
          netTHB: 0,
        });
      }
      const m = byMerchant.get(merchantId)!;
      m.itemCount++;
      m.grossTHB += Number(item.priceTHB);
      m.commissionTHB += Number(item.commissionAmount ?? 0);
      // netAmount is null for orders approved before this feature — treat as 100% net
      m.netTHB += item.netAmount !== null ? Number(item.netAmount) : Number(item.priceTHB);
    }

    return [...byMerchant.values()];
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

  // ─── Delete (draft only) ─────────────────────────────────────────────────

  async deleteProduct(productId: string, requesterId: string, isAdmin: boolean) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found.');
    if (!isAdmin && product.uploadedBy !== requesterId) throw new NotFoundException('Product not found.');
    if (product.isPublished) throw new BadRequestException('Unpublish the product before deleting it.');

    await this.prisma.product.update({
      where: { id: productId },
      data: { isDeleted: true },
    });
  }

  // ─── Publish / Unpublish ──────────────────────────────────────────────────

  async setPublished(productId: string, isPublished: boolean, requesterId: string, isAdmin: boolean) {
    if (!isAdmin) {
      const existing = await this.prisma.product.findUnique({ where: { id: productId } });
      if (!existing || existing.uploadedBy !== requesterId) throw new NotFoundException('Product not found.');
    }
    const product = await this.prisma.product.update({
      where: { id: productId },
      data: { isPublished },
    });

    // Mirror to MongoDB
    if (product.productType === ProductType.EBOOK) {
      await this.catalog.setEbookPublishedByProductId(productId, isPublished);
    } else {
      await this.catalog.setTarotDeckPublishedByProductId(productId, isPublished);
    }

    return product;
  }
}
