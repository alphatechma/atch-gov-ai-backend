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
  webhook(@Body() body: { data?: { filler?: string } }) {
    return { received: true, size: body?.data?.filler?.length ?? null };
  }

  @Post('auth/login')
  @HttpCode(HttpStatus.OK)
  login(@Body() body: { email?: string; password?: string }) {
    return { email: body?.email ?? null, password: body?.password ?? null };
  }
}

/** A payload well past the 100kb default, like a base64 photo. */
const oversized = { data: { filler: 'x'.repeat(400 * 1024) } };

describe('configureBodyLimits', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ProbeController],
    }).compile();

    app = moduleRef.createNestApplication({ bodyParser: false });
    app.setGlobalPrefix('api');
    configureBodyLimits(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('accepts a webhook payload larger than the default limit', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/whatsapp/webhook/tenant-1/connection-1')
      .send(oversized)
      .expect(200);

    expect(res.body).toEqual({ received: true, size: 400 * 1024 });
  });

  // Raising the webhook limit once cost every other route its body parser:
  // Nest skips its own registration when a middleware named `jsonParser` is
  // already mounted, so login arrived with an empty body and failed validation.
  it('still parses the body on every other route', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 's3cret' })
      .expect(200);

    expect(res.body).toEqual({
      email: 'user@example.com',
      password: 's3cret',
    });
  });

  // 413 is what the parser itself raises; in the running app AllExceptionsFilter
  // relabels it as a 500, which is how these rejections show up in the logs.
  it('keeps the conservative limit on every other route', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send(oversized)
      .expect(413);
  });
});
