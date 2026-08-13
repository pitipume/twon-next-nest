export class GoogleAuthCommand {
  constructor(
    public readonly googleId: string,
    public readonly email: string,
    public readonly displayName: string,
  ) {}
}
