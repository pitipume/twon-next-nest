import { BadRequestException, Controller, Get, NotFoundException, Param, Query, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { UserRole } from '@prisma/client';
import { GetProductsQuery } from './queries/get-products/get-products.query';
import { GetProductDetailQuery } from './queries/get-product-detail/get-product-detail.query';
import { CatalogManager } from './managers/catalog.manager';
import { ApiResponse } from '../../common/response/api-response';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

const VALID_TYPES = ['ebook', 'tarot_deck'];

// Stays guest-accessible — OptionalJwtAuthGuard never rejects, it just tells
// us who's asking (if anyone) so eTarot can stay ADMIN-only while testing.
@UseGuards(OptionalJwtAuthGuard)
@Controller('catalog')
export class CatalogController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly manager: CatalogManager,
  ) {}

  // GET /api/catalog?type=ebook&page=1&limit=20
  @Get()
  getProducts(
    @Query('type') type?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('search') search?: string,
    @CurrentUser() user?: { role: string },
  ) {
    if (type && !VALID_TYPES.includes(type)) {
      throw new BadRequestException(`type must be one of: ${VALID_TYPES.join(', ')}`);
    }
    return this.queryBus.execute(
      new GetProductsQuery(
        type,
        Number(page),
        Number(limit),
        search?.trim() || undefined,
        user?.role === UserRole.ADMIN,
      ),
    );
  }

  // GET /api/catalog/ebooks/:id
  @Get('ebooks/:id')
  getEbook(@Param('id') id: string) {
    return this.queryBus.execute(new GetProductDetailQuery(id, 'ebook'));
  }

  // GET /api/catalog/tarot-decks/:id
  @Get('tarot-decks/:id')
  getTarotDeck(@Param('id') id: string, @CurrentUser() user?: { role: string }) {
    return this.queryBus.execute(new GetProductDetailQuery(id, 'tarot_deck', user?.role === UserRole.ADMIN));
  }

  // GET /api/catalog/:id/preview — signed PDF URL for free preview pages (no auth required)
  @Get(':id/preview')
  async getEbookPreview(@Param('id') id: string) {
    const result = await this.manager.getEbookPreview(id);
    if (!result) throw new NotFoundException('Preview not available for this product.');
    return ApiResponse.success(result);
  }

  // GET /api/catalog/:id — generic, auto-detects ebook or tarot deck by product ID
  @Get(':id')
  getProduct(@Param('id') id: string, @CurrentUser() user?: { role: string }) {
    return this.queryBus.execute(new GetProductDetailQuery(id, 'auto', user?.role === UserRole.ADMIN));
  }
}
