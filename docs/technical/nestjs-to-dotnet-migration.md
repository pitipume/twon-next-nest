# NestJS → .NET Migration Guide

> This doc exists "just in case" — a fallback reference if the decision is made
> to switch from NestJS to ASP.NET Core. No code needs to be thrown away.
> The architecture is identical. Only the syntax changes.

---

## When You Would Switch

Consider switching if:
- The team grows and everyone already knows C# better than TypeScript
- A complex algorithmic requirement benefits from .NET performance
- You want to use .NET-native libraries (e.g. ML.NET, specific financial SDKs)
- Personal comfort preference wins over ecosystem benefits

**Do NOT switch just because NestJS feels unfamiliar early on.**
NestJS and .NET ASP.NET Core share almost identical concepts — the learning curve flattens fast.

---

## What Stays the Same (Zero Migration Cost)

- PostgreSQL schema (Prisma schema → EF Core entities, same tables)
- MongoDB documents (same schema, just different driver)
- Redis usage (same keys, TTLs, patterns)
- Cloudflare R2 (AWS SDK works in .NET too — `AWSSDK.S3` NuGet)
- Stripe + Omise (both have official .NET SDKs)
- Docker + docker-compose (same `docker-compose.yml`)
- GitHub Actions (same workflow files)
- All environment variables (same `.env` values)
- The database migrations (PostgreSQL stays)
- The entire frontend (Next.js is unaffected)

**Only the backend `apps/api` folder changes.**

---

## Full Concept Mapping

### Project Structure

```
NestJS                              .NET ASP.NET Core
─────────────────────────────────────────────────────
apps/api/src/                       src/
  app.module.ts                       Program.cs + startup
  modules/auth/                       Modules/Auth/
  modules/catalog/                    Modules/Catalog/
  modules/store/                      Modules/Store/
  modules/payment/                    Modules/Payment/
  modules/library/                    Modules/Library/
  modules/admin/                      Modules/Admin/
  modules/notification/               Modules/Notification/
  infrastructure/prisma/              Database/ (EfRepository, DbContext)
  infrastructure/redis/               Infrastructure/Cache/
  common/response/api-response.ts     BuildingBlocks/BaseResult.cs
```

### Layer-by-Layer

#### Controller
```typescript
// NestJS
@Controller('auth')
export class AuthController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.commandBus.execute(new LoginCommand(dto));
  }
}
```
```csharp
// .NET
[ApiController]
[Route("auth")]
public class AuthController : ControllerBase
{
    private readonly IMediator _mediator;
    public AuthController(IMediator mediator) { _mediator = mediator; }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
        => Ok(await _mediator.Send(request));
}
```

#### Command + Handler

```typescript
// NestJS
export class LoginCommand {
  constructor(public readonly email: string, public readonly password: string) {}
}

@CommandHandler(LoginCommand)
export class LoginHandler implements ICommandHandler<LoginCommand> {
  constructor(private readonly manager: AuthManager) {}

  async execute(command: LoginCommand) {
    command.email = command.email?.toLowerCase().trim(); // normalize

    const result = await this.manager.login(command);
    if (!result.success) return ApiResponse.invalidCredentials();
    return ApiResponse.success(result.data);
  }
}
```
```csharp
// .NET
public record LoginRequest(string Email, string Password) : IRequest<LoginResponse>;

public class LoginHandler : IRequestHandler<LoginRequest, LoginResponse>
{
    private readonly IAuthManager _manager;
    public LoginHandler(IAuthManager manager) { _manager = manager; }

    public async Task<LoginResponse> Handle(LoginRequest request, CancellationToken ct)
    {
        request = request with { Email = request.Email?.ToLower().Trim() };  // normalize

        var result = await _manager.Login(request);
        if (!result.success) return new LoginResponse(BaseResult.InvalidCredentials);
        return new LoginResponse(BaseResult.Success) { Data = result.data };
    }
}
```

#### Validation

```typescript
// NestJS — class-validator decorators on DTO
export class LoginDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}
// Wired globally via: app.useGlobalPipes(new ValidationPipe({ whitelist: true }))
```
```csharp
// .NET — FluentValidation in separate file
public class LoginValidator : AbstractValidator<LoginRequest>
{
    public LoginValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Password).NotEmpty().MinimumLength(8);
    }
}
// Wired via: builder.Services.AddFluentValidationAutoValidation()
```

#### Manager

```typescript
// NestJS
@Injectable()
export class AuthManager {
  constructor(private readonly service: AuthService) {}

  async login(cmd: LoginCommand): Promise<{ success: boolean; data?: TokenPair }> {
    const user = await this.service.findByEmail(cmd.email);
    if (!user) return { success: false };
    const valid = await bcrypt.compare(cmd.password, user.passwordHash);
    if (!valid) return { success: false };
    const tokens = await this.service.generateTokens(user);
    return { success: true, data: tokens };
  }
}
```
```csharp
// .NET — identical logic, different syntax
public class AuthManager : IAuthManager
{
    private readonly IAuthService _service;
    public AuthManager(IAuthService service) { _service = service; }

    public async Task<(bool success, TokenPair? data)> Login(LoginRequest request)
    {
        var user = await _service.FindByEmail(request.Email);
        if (user is null) return (false, null);
        if (!BCrypt.Verify(request.Password, user.PasswordHash)) return (false, null);
        var tokens = await _service.GenerateTokens(user);
        return (true, tokens);
    }
}
```

#### Guards / Auth Filters

```typescript
// NestJS Guard = .NET IAuthorizationFilter
@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    // validate JWT from Authorization header
  }
}

// Usage
@UseGuards(JwtAuthGuard)
@Get('profile')
getProfile() { ... }
```
```csharp
// .NET
[Authorize]  // uses JWT middleware configured in Program.cs
[HttpGet("profile")]
public IActionResult GetProfile() { ... }
```

#### Module Registration

```typescript
// NestJS
@Module({
  controllers: [AuthController],
  providers: [AuthManager, AuthService, AuthRepository],
  exports: [AuthManager],
})
export class AuthModule {}
```
```csharp
// .NET
public static class AuthModuleConfiguration
{
    public static IServiceCollection AddAuthModule(this IServiceCollection services)
    {
        services.AddScoped<IAuthManager, AuthManager>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IAuthRepository, AuthRepository>();
        return services;
    }
}
// In Program.cs:
builder.Services.AddAuthModule();
```

---

## Package Equivalents

| NestJS Package | .NET NuGet Equivalent |
|---|---|
| `@nestjs/cqrs` | `MediatR` + `MediatR.Extensions.Microsoft.DependencyInjection` |
| `class-validator` | `FluentValidation` |
| `@prisma/client` | `Microsoft.EntityFrameworkCore` + `Ardalis.Specification` |
| `mongoose` | `MongoDB.Driver` |
| `ioredis` | `StackExchange.Redis` |
| `bcrypt` | `BCrypt.Net-Next` |
| `jsonwebtoken` / `@nestjs/jwt` | `System.IdentityModel.Tokens.Jwt` / `Microsoft.AspNetCore.Authentication.JwtBearer` |
| `resend` | `MailKit` or `SendGrid` SDK |
| `stripe` | `Stripe.net` |
| `@aws-sdk/client-s3` | `AWSSDK.S3` |
| `bullmq` | `Hangfire` |

---

## Migration Steps (if you ever do it)

1. **Keep** `apps/web/` untouched — frontend is unaffected
2. **Keep** `docker-compose.yml` — databases unchanged
3. **Keep** `docs/` — architecture unchanged
4. **Replace** `apps/api/` with new ASP.NET Core solution:
   ```bash
   # Create new .NET solution
   cd apps
   dotnet new sln -n Aura.API
   dotnet new webapi -n Aura.API -o api-dotnet
   # Then scaffold modules to match same structure
   ```
5. **Prisma schema → EF Core:** The `schema.prisma` tables map 1:1 to EF Core entities
6. **MongoDB schemas:** Copy Mongoose schema field names to C# classes with `[BsonElement]`
7. **Re-run:** `docker compose up -d` → `dotnet ef database update` — same DB, new ORM

---

## Honest Assessment

| Dimension | NestJS Wins | .NET Wins |
|---|---|---|
| Shared types with Next.js FE | ✅ Same TypeScript | ❌ Need separate type sync |
| Architecture familiarity | ✅ Same patterns | ✅ Already know it |
| Trading bot ecosystem | ✅ ccxt native | ❌ Weaker crypto libs |
| Team hiring | ✅ More JS devs globally | Depends on region |
| Raw performance | Slightly lower | ✅ Faster for CPU tasks |
| Enterprise tooling | Good | ✅ More mature |

**Bottom line:** Start with NestJS. If after 2–3 months it genuinely causes more pain than gain, use this guide to migrate. The business logic does not change — only the syntax.
