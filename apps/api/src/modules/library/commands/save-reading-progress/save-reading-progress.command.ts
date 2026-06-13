export class SaveReadingProgressCommand {
  constructor(
    public readonly userId: string,
    public readonly role: string,
    public readonly productId: string,
    public readonly currentPage: number,
    public readonly totalPages: number,
  ) {}
}
