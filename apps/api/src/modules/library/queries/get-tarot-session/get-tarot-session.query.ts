export class GetTarotSessionQuery {
  constructor(
    public readonly userId: string,
    public readonly productId: string,
  ) {}
}
