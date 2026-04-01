import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type EbookDocument = HydratedDocument<Ebook>;

@Schema({ collection: 'ebooks', timestamps: true })
export class Ebook {
  @Prop({ required: true, unique: true })
  postgresProductId: string; // FK → products.id in PostgreSQL

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  author: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  coverImageUrl: string;

  @Prop({ required: true })
  fileKey: string; // S3/R2 key — NOT a public URL

  @Prop({ required: true, default: 0 })
  totalPages: number;

  @Prop({ default: 'th' })
  language: string;

  @Prop({ type: [String], default: [] })
  categories: string[];

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ default: 0 })
  previewPages: number; // free pages before purchase required

  @Prop({ default: false })
  isPublished: boolean;

  @Prop()
  publishedAt?: Date;

  @Prop({ required: true })
  createdBy: string; // admin userId
}

export const EbookSchema = SchemaFactory.createForClass(Ebook);

// Index for fast catalog queries
EbookSchema.index({ isPublished: 1, createdAt: -1 });
EbookSchema.index({ categories: 1 });
EbookSchema.index({ tags: 1 });
