import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../generated/prisma/client.js';
import { env } from '../config/env.js';

let client: PrismaClient | null = null;

const getDatabaseOptions = () => {
  if (!env.databaseUrl) {
    throw new Error('DATABASE_URL is required for database-backed routes.');
  }

  const url = new URL(env.databaseUrl);
  const database = decodeURIComponent(url.pathname.slice(1));

  if (!url.hostname || !database) {
    throw new Error('DATABASE_URL must include a host and database name.');
  }

  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database,
    connectionLimit: 5,
  };
};

export const getPrisma = (): PrismaClient => {
  if (!client) {
    const adapter = new PrismaMariaDb(getDatabaseOptions());
    client = new PrismaClient({ adapter });
  }

  return client;
};
