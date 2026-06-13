import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
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
      adminId: user.id,
      pdfKey: dto.pdfKey,
      coverKey: dto.coverKey || undefined,
      totalPages: dto.totalPages ?? 0,
    });

    return { code: 'A001', status: 'success', data: result };
  }

  // POST /api/admin/tarot-decks/upload-urls — get presigned PUT URLs
  @Post('tarot-decks/upload-urls')
  getTarotUploadUrls() {
    return this.service.getTarotUploadUrls(randomUUID());
  }

  // POST /api/admin/tarot-decks — confirm upload; ZIP is downloaded from R2 and processed
  @Post('tarot-decks')
  async uploadTarotDeck(
    @Body() dto: UploadTarotDeckDto,
    @CurrentUser() user: { id: string },
  ) {
    const result = await this.service.uploadTarotDeck({
      name: dto.name,
      description: dto.description,
      priceTHB: dto.priceTHB,
      adminId: user.id,
      zipKey: dto.zipKey,
      coverKey: dto.coverKey || undefined,
      backKey: dto.backKey || undefined,
    });

    return { code: 'A001', status: 'success', data: result };
  }

  // DELETE /api/admin/products/:id — draft only
  @Delete('products/:id')
  deleteProduct(@Param('id') id: string) {
    return this.service.deleteProduct(id);
  }

  // PATCH /api/admin/products/:id/publish
  @Patch('products/:id/publish')
  publish(@Param('id') id: string) {
    return this.service.setPublished(id, true);
  }

  // PATCH /api/admin/products/:id/unpublish
  @Patch('products/:id/unpublish')
  unpublish(@Param('id') id: string) {
    return this.service.setPublished(id, false);
  }

  // GET /api/admin/products — list all products including unpublished
  @Get('products')
  getAllProducts() {
    return this.service.getAllProducts();
  }

  // GET /api/admin/payment-config — load current config
  @Get('payment-config')
  getPaymentConfig() {
    return this.service.getPaymentConfig();
  }

  // PUT /api/admin/payment-config — set bank name + account details
  @Put('payment-config')
  setPaymentConfig(@Body() dto: SetPaymentConfigDto) {
    return this.service.setPaymentConfig({
      bankName: dto.bankName,
      accountName: dto.accountName,
      accountNumber: dto.accountNumber,
    });
  }

  // POST /api/admin/payment-config/qr — upload PromptPay QR image (still multipart, small file)
  @Post('payment-config/qr')
  @UseInterceptors(FileInterceptor('file'))
  async uploadPaymentQr(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('QR image file is required.');
    return this.service.uploadPaymentQr(file.buffer, file.mimetype);
  }
}
