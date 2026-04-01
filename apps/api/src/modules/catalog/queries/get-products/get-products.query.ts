export class GetProductsQuery {
  constructor(
    public readonly type?: string,   // 'ebook' | 'tarot_deck' | undefined (all)
    public readonly page: number = 1,
    public readonly limit: number = 20,
  ) {}
}
