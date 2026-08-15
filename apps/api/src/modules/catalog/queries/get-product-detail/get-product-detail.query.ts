export class GetProductDetailQuery {
  constructor(
    public readonly productId: string,
    public readonly productType: 'ebook' | 'tarot_deck' | 'auto',
    public readonly isAdmin: boolean = false,
  ) {}
}
