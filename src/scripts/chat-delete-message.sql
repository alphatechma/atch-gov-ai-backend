-- Migração manual: exclusão de mensagens no chat (estilo WhatsApp)
-- Em desenvolvimento essas colunas são criadas automaticamente pelo synchronize do TypeORM.
-- Em PRODUÇÃO, rode este SQL uma vez na base antes de subir a nova versão.

-- "Apagar para todos": mantém a linha, mas marca a mensagem como apagada.
ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS "deleted" boolean NOT NULL DEFAULT false;

ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS "deletedAt" timestamp NULL;

-- "Apagar só para mim": IDs dos usuários que ocultaram a mensagem apenas para si.
ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS "deletedFor" jsonb NOT NULL DEFAULT '[]'::jsonb;
