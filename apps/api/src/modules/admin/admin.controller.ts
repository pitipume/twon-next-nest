import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserRole } from '@prisma/client';
import { randomUUID } from 'crypto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AdminService } from './services/admin.service';
import { UploadEbookDto } from './dto/upload-ebook.dto';
import { UploadTarotDeckDto } from './dto/upload-tarot-deck.dto';
import { SetPaymentConfigDto } from './dto/set-payment-config.dto';
import { SetMaintenanceConfigDto } from './dto/set-maintenance-config.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { ApiResponse } from '../../common/response/api-response';
import { Features } from '../../config/features';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.MERCHANT, UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly service: AdminService) {}

  // POST /api/admin/ebooks/upload-urls — get presigned PUT URLs for direct R2 upload
  @Post('ebooks/upload-urls')
  getEbookUploadUrls() {
    return this.service.getEbookUploadUrls(randomUUID());
  }

  // POST /api/admin/ebooks — confirm upload; body is JSON with R2 keys
  @Post('ebooks')
  async uploadEbook(
    @Body() dto: UploadEbookDto,
    @CurrentUser() user: { id: string },
  ) {
    const result = await this.service.uploadEbook({
      title: dto.title,
      author: dto.author,
      description: dto.description,
      priceTHB: dto.priceTHB,
      previewPages: dto.previewPages ?? 0,
      language: dto.language ?? 'th',
      categories: dto.categories ? dto.categories.split(',').map((s) => s.trim()) : [],
      tags: dto.tags ? dto.tags.split(',').map((s) => s.trim()) : [],
      userId: user.id,
      pdfKey: dto.pdfKey,
      coverKey: dto.coverKey || undefined,
      totalPages: dto.totalPages ?? 0,
    });

    return { code: 'A001', status: 'success', data: result };
  }

  // POST /api/admin/tarot-decks/upload-urls — get presigned PUT URLs  [ADMIN only, eTarot flag]
  @Post('tarot-decks/upload-urls')
  @Roles(UserRole.ADMIN)
  getTarotUploadUrls() {
    if (!Features.etarot) throw new NotFoundException();
    return this.service.getTarotUploadUrls(randomUUID());
  }

  // POST /api/admin/tarot-decks — confirm upload; ZIP is downloaded from R2 and processed  [ADMIN only, eTarot flag]
  @Post('tarot-decks')
  @Roles(UserRole.ADMIN)
  async uploadTarotDeck(
    @Body() dto: UploadTarotDeckDto,
    @CurrentUser() user: { id: string },
  ) {
    if (!Features.etarot) throw new NotFoundException();
    const result = await this.service.uploadTarotDeck({
      name: dto.name,
      description: dto.description,
      priceTHB: dto.priceTHB,
      userId: user.id,
      zipKey: dto.zipKey,
      coverKey: dto.coverKey || undefined,
      backKey: dto.backKey || undefined,
    });

    return { code: 'A001', status: 'success', data: result };
  }

  // DELETE /api/admin/products/:id — draft only; merchant can only delete own
  @Delete('products/:id')
  deleteProduct(@Param('id') id: string, @CurrentUser() user: { id: string; role: string }) {
    return this.service.deleteProduct(id, user.id, user.role === UserRole.ADMIN);
  }

  // PATCH /api/admin/products/:id/publish — merchant can only publish own
  @Patch('products/:id/publish')
  publish(@Param('id') id: string, @CurrentUser() user: { id: string; role: string }) {
    return this.service.setPublished(id, true, user.id, user.role === UserRole.ADMIN);
  }

  // PATCH /api/admin/products/:id/unpublish — merchant can only unpublish own
  @Patch('products/:id/unpublish')
  unpublish(@Param('id') id: string, @CurrentUser() user: { id: string; role: string }) {
    return this.service.setPublished(id, false, user.id, user.role === UserRole.ADMIN);
  }

  // GET /api/admin/products — admin sees all; merchant sees own only
  @Get('products')
  getAllProducts(@CurrentUser() user: { id: string; role: string }) {
    const merchantId = user.role === UserRole.ADMIN ? undefined : user.id;
    return this.service.getAllProducts(merchantId);
  }

  // GET /api/admin/users/search?email=xxx  [ADMIN only]
  @Get('users/search')
  @Roles(UserRole.ADMIN)
  async searchUser(@Query('email') email: string) {
    if (!email) return ApiResponse.failure('Email is required.');
    const user = await this.service.findUserByEmail(email);
    if (!user) return ApiResponse.failure('No user found with that email.');
    return ApiResponse.success(user);
  }

  // PATCH /api/admin/users/role  [ADMIN only]
  @Patch('users/role')
  @Roles(UserRole.ADMIN)
  async updateUserRole(@CurrentUser() admin: { id: string }, @Body() dto: UpdateUserRoleDto) {
    try {
      const user = await this.service.updateUserRole(dto.userId, dto.role, admin.id);
      return ApiResponse.success(user, `Role updated to ${dto.role}.`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to update role.';
      return ApiResponse.failure(msg);
    }
  }

  // GET /api/admin/payment-config — load current config  [ADMIN only]
  @Get('payment-config')
  @Roles(UserRole.ADMIN)
  async getPaymentConfig() {
    const config = await this.service.getPaymentConfig();
    return ApiResponse.success(config);
  }

  // PUT /api/admin/payment-config — set bank name + account details  [ADMIN only]
  @Put('payment-config')
  @Roles(UserRole.ADMIN)
  async setPaymentConfig(@Body() dto: SetPaymentConfigDto) {
    const result = await this.service.setPaymentConfig({
      bankName: dto.bankName,
      accountName: dto.accountName,
      accountNumber: dto.accountNumber,
      commissionRate: dto.commissionRate,
    });
    return ApiResponse.success(result);
  }

  // GET /api/admin/maintenance-config — load current state  [ADMIN only]
  // Exempt from MaintenanceGuard (see modules/system) so ADMIN can always
  // reach this even while maintenance is active.
  @Get('maintenance-config')
  @Roles(UserRole.ADMIN)
  async getMaintenanceConfig() {
    const config = await this.service.getMaintenanceConfig();
    return ApiResponse.success(config);
  }

  // PUT /api/admin/maintenance-config — toggle site-wide maintenance mode  [ADMIN only]
  @Put('maintenance-config')
  @Roles(UserRole.ADMIN)
  async setMaintenanceConfig(@Body() dto: SetMaintenanceConfigDto) {
    const result = await this.service.setMaintenanceConfig({
      enabled: dto.enabled,
      backByAt: dto.backByAt ? new Date(dto.backByAt) : null,
    });
    return ApiResponse.success(result);
  }

  // GET /api/admin/merchant-earnings — ADMIN sees all merchants; MERCHANT sees own only
  @Get('merchant-earnings')
  async getMerchantEarnings(@CurrentUser() user: { id: string; role: string }) {
    const merchantId = user.role === UserRole.ADMIN ? undefined : user.id;
    const data = await this.service.getMerchantEarnings(merchantId);
    return ApiResponse.success(data);
  }

  // POST /api/admin/payment-config/qr — upload PromptPay QR image  [ADMIN only]
  @Post('payment-config/qr')
  @Roles(UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  async uploadPaymentQr(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('QR image file is required.');
    const result = await this.service.uploadPaymentQr(file.buffer, file.mimetype);
    return ApiResponse.success(result);
  }
}
