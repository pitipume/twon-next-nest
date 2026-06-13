export class GetReadingSessionQuery {
  constructor(
    public readonly userId: string,
    public readonly role: string,
    public readonly productId: string,
  ) {}
}
