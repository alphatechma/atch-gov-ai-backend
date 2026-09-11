import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { configureBodyLimits } from './body-limits';

/** Stands in for WhatsappController's webhook route and a regular API route. */
@Controller()
class ProbeController {
  @Post('whatsapp/webhook/:tenantId/:connectionId')
  @HttpCode(HttpStatus.OK)
  webhook(@Body() body: any) {
    return { received: true, size: JSON.stringify(body).length };
  }

  @Post('voters')
  @HttpCode(HttpStatus.OK)
  voters(@Body() body: any) {
    return { received: true, size: JSON.stringify(body).length };
  }
}

/** A payload well past Express's 100kb default, like a base64 photo. */
const oversized = { data: { filler: 'x'.repeat(400 * 1024) } };

describe('configureBodyLimits', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ProbeController],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    configureBodyLimits(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('accepts a webhook payload larger than the Express default', async () => {
    await request(app.getHttpServer())
      .post('/api/whatsapp/webhook/tenant-1/connection-1')
      .send(oversized)
      .expect(200);
  });

  // body-parser's PayloadTooLargeError is not an HttpException, so Nest
  // surfaces the rejection as a 500 rather than a 413. That is what production
  // returns today for an oversized webhook, and what the logs show.
  it('keeps the conservative default on every other route', async () => {
    await request(app.getHttpServer())
      .post('/api/voters')
      .send(oversized)
      .expect(500);
  });
});
