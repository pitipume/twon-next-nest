import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ReadingProgressDocument = HydratedDocument<ReadingProgress>;

@Schema({ collection: 'reading_progress', timestamps: true })
export class ReadingProgress {
  @Prop({ required: true })
  userId: string; // postgres user id

  @Prop({ required: true })
  productId: string; // postgres product id

  @Prop({ default: 1 })
  currentPage: number;

  @Prop({ default: 0 })
  totalPages: number;

  @Prop({ default: 0 })
  percentComplete: number;

  @Prop()
  lastReadAt: Date;

  @Prop({
    type: [
      {
        page: Number,
        note: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
    default: [],
  })
  bookmarks: { page: number; note: string; createdAt: Date }[];
}

export const ReadingProgressSchema = SchemaFactory.createForClass(ReadingProgress);

ReadingProgressSchema.index({ userId: 1, productId: 1 }, { unique: true });
ReadingProgressSchema.index({ userId: 1 });
