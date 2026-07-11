import { Injectable, NotImplementedException } from '@nestjs/common';

/** Playwright-core ile HTML→PDF; Chromium kurulu değilse anlaşılır hata verir. */
@Injectable()
export class PdfService {
  async htmlToPdf(html: string): Promise<Buffer> {
    let chromium: typeof import('playwright-core').chromium;
    try {
      ({ chromium } = await import('playwright-core'));
    } catch {
      throw new NotImplementedException(
        'PDF üretimi için Chromium gerekli: npx playwright-core install --with-deps chromium',
      );
    }
    const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
    const browser = await chromium.launch({
      ...(executablePath ? { executablePath } : {}),
      // Container root olmadan çalışsa da Chromium sandbox namespace'i
      // her Docker hostunda kullanılamayabilir.
      args: ['--no-sandbox'],
    });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle' });
      const pdf = await page.pdf({ format: 'A4', printBackground: true });
      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }
}
