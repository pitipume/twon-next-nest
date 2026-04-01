import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LibraryController } from './library.controller';
import { LibraryManager } from './managers/library.manager';
import { LibraryService } from './services/library.service';
import { LibraryRepository } from './repositories/library.repository';
import { ReadingProgress, ReadingProgressSchema } from './schemas/reading-progress.schema';
import { CatalogModule } from '../catalog/catalog.module';
import { GetLibraryHandler } from './queries/get-library/get-library.handler';
import { GetReadingSessionHandler } from './queries/get-reading-session/get-reading-session.handler';
import { GetTarotSessionHandler } from './queries/get-tarot-session/get-tarot-session.handler';
import { SaveReadingProgressHandler } from './commands/save-reading-progress/save-reading-progress.handler';

const QueryHandlers = [GetLibraryHandler, GetReadingSessionHandler, GetTarotSessionHandler];
const CommandHandlers = [SaveReadingProgressHandler];

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ReadingProgress.name, schema: ReadingProgressSchema },
    ]),
    CatalogModule, // imports CatalogRepository for ebook/deck lookups
  ],
  controllers: [LibraryController],
  providers: [
    ...QueryHandlers,
    ...CommandHandlers,
    LibraryManager,
    LibraryService,
    LibraryRepository,
  ],
  exports: [LibraryService], // exported so Payment module can grant access after purchase
})
export class LibraryModule {}
