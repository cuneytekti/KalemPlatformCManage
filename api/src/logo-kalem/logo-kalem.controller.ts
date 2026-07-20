import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { JwtPayload } from '../auth/jwt-auth.guard';
import { LogoKalemActivityDto, LogoKalemCatalogDto, SaveLogoKalemQuoteDto } from './logo-kalem.dto';
import { LogoKalemService } from './logo-kalem.service';

@Controller('logo-kalem-quotes')
export class LogoKalemController {
  constructor(private readonly service: LogoKalemService) {}

  @Get() list() { return this.service.list(); }
  @Post() create(@Body() input: SaveLogoKalemQuoteDto) { return this.service.create(input); }
  @Get(':id') detail(@Param('id', ParseUUIDPipe) id: string, @Query('revisionId') revisionId?: string) { return this.service.detail(id, revisionId); }
  @Patch(':id') update(@Param('id', ParseUUIDPipe) id: string, @Body() input: SaveLogoKalemQuoteDto) { return this.service.update(id, input); }
  @Get(':id/revisions') revisions(@Param('id', ParseUUIDPipe) id: string) { return this.service.listRevisions(id); }
  @Post(':id/revisions') revision(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request & { user?: JwtPayload }) { return this.service.newRevision(id, req.user?.email); }
  @Get(':id/pdf') async pdf(@Param('id', ParseUUIDPipe) id: string, @Query('revisionId') revisionId: string | undefined, @Res() response: Response) {
    const result = await this.service.renderPdf(id, revisionId);
    response.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${result.filename}"` }).send(result.pdf);
  }
  @Post(':id/send') send(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request & { user?: JwtPayload }) { return this.service.send(id, req.user?.email); }
  @Get(':id/activities') activities(@Param('id', ParseUUIDPipe) id: string) { return this.service.getActivities(id); }
  @Post(':id/activities') addActivity(@Param('id', ParseUUIDPipe) id: string, @Body() input: LogoKalemActivityDto, @Req() req: Request & { user?: JwtPayload }) { return this.service.addActivity(id, input, req.user?.email); }
}

@Controller('logo-kalem-catalog')
export class LogoKalemCatalogController {
  constructor(private readonly service: LogoKalemService) {}
  @Get() list() { return this.service.listCatalog(); }
  @Post() create(@Body() input: LogoKalemCatalogDto) { return this.service.createCatalog(input); }
  @Patch(':id') update(@Param('id', ParseUUIDPipe) id: string, @Body() input: LogoKalemCatalogDto) { return this.service.updateCatalog(id, input); }
}
