import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TarotDeckDocument = HydratedDocument<TarotDeck>;

// Embedded card subdocument — no separate collection needed
@Schema({ _id: false })
export class TarotCard {
  @Prop({ required: true })
  cardNumber: number; // 0-77 for standard 78-card deck

  @Prop({ required: true })
  name: string;

  @Prop()
  nameTh?: string; // Thai name (optional)

  @Prop({ required: true })
  imageKey: string; // R2/S3 key — NOT a public URL

  @Prop({ default: '' })
  uprightMeaning: string;

  @Prop({ default: '' })
  reversedMeaning: string;

  @Prop({ type: [String], default: [] })
  keywords: string[];

  @Prop({ enum: ['major', 'wands', 'cups', 'swords', 'pentacles'], default: 'major' })
  suit: string;
}

@Schema({ collection: 'tarot_decks', timestamps: true })
export class TarotDeck {
  @Prop({ unique: true, sparse: true })
  postgresProductId?: string; // FK → products.id in PostgreSQL (set after Prisma product created)

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ default: '' })
  coverImageUrl: string; // empty if no cover uploaded

  @Prop({ default: '' })
  backImageKey: string; // card back design — R2/S3 key, empty if not provided

  @Prop({ required: true, default: 78 })
  cardCount: number;

  @Prop({ default: false })
  isPublished: boolean;

  @Prop()
  publishedAt?: Date;

  @Prop({ required: true })
  createdBy: string; // admin userId

  @Prop({ type: [TarotCard], default: [] })
  cards: TarotCard[];
}

export const TarotDeckSchema = SchemaFactory.createForClass(TarotDeck);

TarotDeckSchema.index({ isPublished: 1, createdAt: -1 });
