import type { INestApplication } from '@nestjs/common';
import { json, urlencoded } from 'express';

/** Route prefix Evolution posts to (both the scoped and the legacy webhook). */
export const WEBHOOK_PATH = '/api/whatsapp/webhook';

/**
 * WhatsApp caps media at 16MB and base64 inflates it by ~4/3, so 25mb covers
 * the largest attachment plus the JSON envelope around it.
 */
export const WEBHOOK_BODY_LIMIT = '25mb';

/** Express's own default, restated here because we now own the registration. */
export const DEFAULT_BODY_LIMIT = '100kb';

/**
 * Register every body parser the app uses, raising the limit on the Evolution
 * webhook only.
 *
 * The webhook is configured with base64 = true, so every media message arrives
 * with the file inlined. Those payloads blow past the 100kb default and are
 * rejected before the handler runs — the message is never stored and nothing
 * surfaces as an application error. Text slips under the limit, which is why
 * only attachments went missing.
 *
 * The app MUST be created with `bodyParser: false`. Nest would otherwise
 * install its own parsers on init(), and it decides whether to do so by
 * looking for a middleware *named* `jsonParser` in the stack
 * (ExpressAdapter.isMiddlewareApplied). `express.json()` returns a function
 * with exactly that name, so mounting the scoped parser here made Nest skip
 * the global one and every other route lost body parsing entirely. Owning the
 * whole registration keeps that coupling out of the picture.
 *
 * Order matters: the scoped parser claims the webhook body first, and
 * body-parser marks the request as read so the default parser below skips it.
 */
export function configureBodyLimits(app: INestApplication) {
  app.use(WEBHOOK_PATH, json({ limit: WEBHOOK_BODY_LIMIT }));
  app.use(json({ limit: DEFAULT_BODY_LIMIT }));
  app.use(urlencoded({ extended: true, limit: DEFAULT_BODY_LIMIT }));
}
