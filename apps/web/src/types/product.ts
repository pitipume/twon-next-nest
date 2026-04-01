export type ProductType = 'EBOOK' | 'TAROT_DECK';

export interface Product {
  id: string;
  mongoRefId: string;
  productType: ProductType;
  title: string;
  priceTHB: number;
  isPublished: boolean;
  // enriched from MongoDB
  author?: string;
  description?: string;
  coverImageUrl?: string;
  language?: string;
  categories?: string[];
  tags?: string[];
  cardCount?: number;
}

export interface EbookSession {
  pdfUrl: string;
  totalPages: number;
  currentPage: number;
  productId: string;
}

export interface TarotCard {
  cardNumber: number;
  name: string;
  imageUrl: string;
  uprightMeaning: string;
  reversedMeaning: string;
  keywords: string[];
}

export interface TarotSession {
  deckName: string;
  backImageUrl: string | null;
  cards: TarotCard[];
  productId: string;
}
