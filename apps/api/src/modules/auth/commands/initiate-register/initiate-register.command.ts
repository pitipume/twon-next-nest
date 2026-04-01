export class InitiateRegisterCommand {
  constructor(
    public readonly email: string,
    public readonly displayName: string,
  ) {}
}
