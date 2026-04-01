import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CatalogController } from './catalog.controller';
import { CatalogManager } from './managers/catalog.manager';
import { CatalogService } from './services/catalog.service';
import { CatalogRepository } from './repositories/catalog.repository';
import { Ebook, EbookSchema } from './schemas/ebook.schema';
import { TarotDeck, TarotDeckSchema } from './schemas/tarot-deck.schema';
import { GetProductsHandler } from './queries/get-products/get-products.handler';
import { GetProductDetailHandler } from './queries/get-product-detail/get-product-detail.handler';

const QueryHandlers = [GetProductsHandler, GetProductDetailHandler];

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Ebook.name, schema: EbookSchema },
      { name: TarotDeck.name, schema: TarotDeckSchema },
    ]),
  ],
  controllers: [CatalogController],
  providers: [
    ...QueryHandlers,
    CatalogManager,
    CatalogService,
    CatalogRepository,
  ],
  exports: [CatalogRepository], // exported so Library + Admin modules can use it
})
export class CatalogModule {}
