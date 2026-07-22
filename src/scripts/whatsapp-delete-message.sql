-- Migração manual: "apagar para todos" no WhatsApp CRM (revoga via Evolution API).
-- Em desenvolvimento essas colunas são criadas automaticamente pelo synchronize do TypeORM.
-- Em PRODUÇÃO, rode este SQL uma vez na base antes de subir a nova versão.

ALTER TABLE whatsapp_messages
  ADD COLUMN IF NOT EXISTS "deleted" boolean NOT NULL DEFAULT false;

ALTER TABLE whatsapp_messages
  ADD COLUMN IF NOT EXISTS "deletedAt" timestamp NULL;
