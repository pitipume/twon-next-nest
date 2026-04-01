export class VerifyRegisterCommand {
  constructor(
    public readonly email: string,
    public readonly otp: string,
    public readonly password: string,
  ) {}
}
