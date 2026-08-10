import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

export const getDatabaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: configService.get('DATABASE_HOST'),
  port: configService.get<number>('DATABASE_PORT'),
  username: configService.get('DATABASE_USER'),
  password: configService.get('DATABASE_PASSWORD'),
  database: configService.get('DATABASE_NAME'),
  ssl:
    configService.get('DATABASE_SSL') === 'true'
      ? { rejectUnauthorized: false }
      : false,
  autoLoadEntities: true,
  // synchronize: por padrão liga em dev, mas pode ser forçado via DB_SYNCHRONIZE.
  // Com o schema já criado, defina DB_SYNCHRONIZE=false para pular a introspecção
  // (que é lenta contra banco remoto) e o boot fica em segundos.
  synchronize:
    configService.get('DB_SYNCHRONIZE') === 'true'
      ? true
      : configService.get('DB_SYNCHRONIZE') === 'false'
        ? false
        : configService.get('NODE_ENV') === 'development',
  // logging: desligado por padrão (evita o dilúvio de queries no console).
  // Ligue com DB_LOGGING=true quando precisar depurar SQL.
  logging: configService.get('DB_LOGGING') === 'true',
});
