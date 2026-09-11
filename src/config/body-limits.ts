import type { INestApplication } from '@nestjs/common';
import { json } from 'express';

/** Route prefix Evolution posts to (both the scoped and the legacy webhook). */
export const WEBHOOK_PATH = '/api/whatsapp/webhook';

/**
 * WhatsApp caps media at 16MB and base64 inflates it by ~4/3, so 25mb covers
 * the largest attachment plus the JSON envelope around it.
 */
export const WEBHOOK_BODY_LIMIT = '25mb';

/**
 * Raise the body limit on the Evolution webhook only.
 *
 * The webhook is configured with base64 = true, so every media message arrives
 * with the file inlined. Those payloads blow past Express's 100kb default and
 * are rejected before the handler runs — the message is never stored and
 * nothing surfaces as an application error. Text slips under the limit, which
 * is why only attachments went missing.
 *
 * Scoped to the webhook path: it is unauthenticated, so the rest of the API
 * keeps the conservative default. Registered before Nest installs its own
 * parser, so this one claims the body first; body-parser marks the request as
 * read and Nest's default parser then skips it.
 */
export function configureBodyLimits(app: INestApplication) {
  app.use(WEBHOOK_PATH, json({ limit: WEBHOOK_BODY_LIMIT }));
}
