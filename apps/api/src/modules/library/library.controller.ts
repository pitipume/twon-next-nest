import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { GetLibraryQuery } from './queries/get-library/get-library.query';
import { GetReadingSessionQuery } from './queries/get-reading-session/get-reading-session.query';
import { GetTarotSessionQuery } from './queries/get-tarot-session/get-tarot-session.query';
import { SaveReadingProgressCommand } from './commands/save-reading-progress/save-reading-progress.command';
import { SaveProgressDto } from './dto/save-progress.dto';

@UseGuards(JwtAuthGuard) // all library routes require login
@Controller('library')
export class LibraryController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  // GET /api/library — user's owned items
  @Get()
  getLibrary(@CurrentUser() user: { id: string }) {
    return this.queryBus.execute(new GetLibraryQuery(user.id));
  }

  // GET /api/library/ebooks/:productId/session — signed URL + reading position
  @Get('ebooks/:productId/session')
  getEbookSession(
    @CurrentUser() user: { id: string },
    @Param('productId') productId: string,
  ) {
    return this.queryBus.execute(new GetReadingSessionQuery(user.id, productId));
  }

  // POST /api/library/ebooks/:productId/progress — auto-save reading position
  @Post('ebooks/:productId/progress')
  saveProgress(
    @CurrentUser() user: { id: string },
    @Param('productId') productId: string,
    @Body() dto: SaveProgressDto,
  ) {
    return this.commandBus.execute(
      new SaveReadingProgressCommand(user.id, productId, dto.currentPage, dto.totalPages),
    );
  }

  // GET /api/library/tarot-decks/:productId/session — signed card URLs for shuffle
  @Get('tarot-decks/:productId/session')
  getTarotSession(
    @CurrentUser() user: { id: string },
    @Param('productId') productId: string,
  ) {
    return this.queryBus.execute(new GetTarotSessionQuery(user.id, productId));
  }
}
