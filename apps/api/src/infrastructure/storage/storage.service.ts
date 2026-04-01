import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    const accountId = config.get('R2_ACCOUNT_ID', '');

    this.client = new S3Client({
      region: 'auto',
      // Cloudflare R2 endpoint — identical to S3 API
      // Swap this endpoint to AWS S3 endpoint later with zero code change
      endpoint: accountId
        ? `https://${accountId}.r2.cloudflarestorage.com`
        : 'http://localhost:9000', // local MinIO fallback
      credentials: {
        accessKeyId: config.get('R2_ACCESS_KEY_ID', 'minioadmin'),
        secretAccessKey: config.get('R2_SECRET_ACCESS_KEY', 'minioadmin'),
      },
    });

    this.bucket = config.get('R2_BUCKET_NAME', 'aura-storage');
  }

  /**
   * Generate a time-limited signed URL for reading a private file.
   * The client gets this URL — they can read the file but cannot
   * determine the real storage path or share it (it expires).
   */
  async getSignedReadUrl(key: string, expiresInSeconds = 7200): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }

  /**
   * Generate a signed URL for uploading a file (used by admin upload flow).
   * Upload goes directly from client to R2 — backend never handles the file bytes.
   */
  async getSignedUploadUrl(
    key: string,
    contentType: string,
    expiresInSeconds = 300,
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });
    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }

  /**
   * Upload a buffer directly from the backend (used for ZIP extraction → card images).
   */
  async upload(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  async delete(key: string): Promise<void> {
    try {
      await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    } catch (error) {
      // Non-fatal — log and continue (same fire-and-forget pattern as EagleLogger)
      this.logger.warn(`Failed to delete storage key ${key}: ${error}`);
    }
  }

  /**
   * Build a consistent storage key (path) for a given file type.
   * Keeps the bucket organized and prevents naming collisions.
   */
  buildKey = {
    ebookFile: (productId: string, filename: string) =>
      `ebooks/${productId}/${filename}`,
    ebookCover: (productId: string) =>
      `ebooks/${productId}/cover.webp`,
    tarotCard: (deckId: string, cardNumber: number) =>
      `tarot/${deckId}/cards/${String(cardNumber).padStart(2, '0')}.webp`,
    tarotCover: (deckId: string) =>
      `tarot/${deckId}/cover.webp`,
    tarotBack: (deckId: string) =>
      `tarot/${deckId}/back.webp`,
  };
}
