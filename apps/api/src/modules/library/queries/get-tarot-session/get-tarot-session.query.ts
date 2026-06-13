export class GetTarotSessionQuery {
  constructor(
    public readonly userId: string,
    public readonly role: string,
    public readonly productId: string,
  ) {}
}
