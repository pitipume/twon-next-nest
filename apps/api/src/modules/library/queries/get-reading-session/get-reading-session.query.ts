export class GetReadingSessionQuery {
  constructor(
    public readonly userId: string,
    public readonly productId: string,
  ) {}
}
