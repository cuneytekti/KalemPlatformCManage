import { Body, Controller, Get, Post, Put } from '@nestjs/common';
import { MailSettingsInput, TestMailSettingsInput } from './mail-settings.dto';
import { MailService, MailSettingsView } from './mail.service';

@Controller('settings/mail')
export class MailController {
  constructor(private readonly mail: MailService) {}

  @Get()
  getSettings(): MailSettingsView {
    return this.mail.getSettings();
  }

  @Put()
  saveSettings(@Body() dto: MailSettingsInput): Promise<MailSettingsView> {
    return this.mail.saveSettings(dto);
  }

  @Post('test')
  testSettings(@Body() dto: TestMailSettingsInput): Promise<{ ok: true; message: string }> {
    const { recipient, ...settings } = dto;
    return this.mail.sendTest(settings, recipient);
  }
}
