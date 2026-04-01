import { BadRequestException, Controller, Get, Param, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { GetProductsQuery } from './queries/get-products/get-products.query';
import { GetProductDetailQuery } from './queries/get-product-detail/get-product-detail.query';

const VALID_TYPES = ['ebook', 'tarot_deck'];

@Controller('catalog')
export class CatalogController {
  constructor(private readonly queryBus: QueryBus) {}

  // GET /api/catalog?type=ebook&page=1&limit=20
  @Get()
  getProducts(
    @Query('type') type?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    if (type && !VALID_TYPES.includes(type)) {
      throw new BadRequestException(`type must be one of: ${VALID_TYPES.join(', ')}`);
    }
    return this.queryBus.execute(new GetProductsQuery(type, Number(page), Number(limit)));
  }

  // GET /api/catalog/ebooks/:id
  @Get('ebooks/:id')
  getEbook(@Param('id') id: string) {
    return this.queryBus.execute(new GetProductDetailQuery(id, 'ebook'));
  }

  // GET /api/catalog/tarot-decks/:id
  @Get('tarot-decks/:id')
  getTarotDeck(@Param('id') id: string) {
    return this.queryBus.execute(new GetProductDetailQuery(id, 'tarot_deck'));
  }
}
