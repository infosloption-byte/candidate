import { Prisma } from "../generated/prisma/client.js";
import { prisma } from "./prisma.js";

export type DbClient = Prisma.TransactionClient;

export const withTransaction = async <T>(work: (tx: DbClient) => Promise<T>): Promise<T> =>
  prisma.$transaction(work);
