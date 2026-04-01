import {
  BadRequestException,
  Body,
  Controller,
  Param,
  Patch,
  Post,
  Put,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AdminService } from './services/admin.service';
import { UploadEbookDto } from './dto/upload-ebook.dto';
import { UploadTarotDeckDto } from './dto/upload-tarot-deck.dto';
import { SetPaymentConfigDto } from './dto/set-payment-config.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly service: AdminService) {}

  // POST /api/admin/ebooks — multipart: pdf (required) + cover (optional)
  @Post('ebooks')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'pdf', maxCount: 1 },
      { name: 'cover', maxCount: 1 },
    ]),
  )
  async uploadEbook(
    @Body() dto: UploadEbookDto,
    @CurrentUser() user: { id: string },
    @UploadedFiles()
    files: { pdf?: Express.Multer.File[]; cover?: Express.Multer.File[] },
  ) {
    if (!files?.pdf?.[0]) {
      return { code: 'A002', status: 'failure', message: 'PDF file is required.' };
    }

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
      pdfBuffer: files.pdf[0].buffer,
      pdfOriginalName: files.pdf[0].originalname,
      coverBuffer: files.cover?.[0]?.buffer,
    });

    return { code: 'A001', status: 'success', data: result };
  }

  // POST /api/admin/tarot-decks — multipart: zip (required) + cover + back (optional)
  @Post('tarot-decks')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'zip', maxCount: 1 },
      { name: 'cover', maxCount: 1 },
      { name: 'back', maxCount: 1 },
    ]),
  )
  async uploadTarotDeck(
    @Body() dto: UploadTarotDeckDto,
    @CurrentUser() user: { id: string },
    @UploadedFiles()
    files: {
      zip?: Express.Multer.File[];
      cover?: Express.Multer.File[];
      back?: Express.Multer.File[];
    },
  ) {
    if (!files?.zip?.[0]) {
      return { code: 'A002', status: 'failure', message: 'ZIP file is required.' };
    }

    const result = await this.service.uploadTarotDeck({
      name: dto.name,
      description: dto.description,
      priceTHB: dto.priceTHB,
      adminId: user.id,
      zipBuffer: files.zip[0].buffer,
      coverBuffer: files.cover?.[0]?.buffer,
      backBuffer: files.back?.[0]?.buffer,
    });

    return { code: 'A001', status: 'success', data: result };
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

  // PUT /api/admin/payment-config — set bank name + account details
  @Put('payment-config')
  setPaymentConfig(@Body() dto: SetPaymentConfigDto) {
    return this.service.setPaymentConfig({
      bankName: dto.bankName,
      accountName: dto.accountName,
      accountNumber: dto.accountNumber,
    });
  }

  // POST /api/admin/payment-config/qr — upload PromptPay QR image
  @Post('payment-config/qr')
  @UseInterceptors(FileInterceptor('file'))
  async uploadPaymentQr(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('QR image file is required.');
    return this.service.uploadPaymentQr(file.buffer, file.mimetype);
  }
}
