export class GetLibraryQuery {
  constructor(
    public readonly userId: string,
    public readonly role: string,
  ) {}
}
