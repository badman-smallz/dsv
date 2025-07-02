import { PrismaClient } from '@prisma/client';

// This prevents multiple instances of Prisma Client in development
const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Create a function to initialize and return Prisma Client
export const getPrismaClient = (): PrismaClient => {
  if (process.env.NODE_ENV === 'production') {
    return new PrismaClient({
      log: ['error', 'warn'],
    });
  }

  if (!globalForPrisma.prisma) {
    console.log('Initializing new Prisma Client...');
    globalForPrisma.prisma = new PrismaClient({
      log: [
        { level: 'query', emit: 'event' },
        { level: 'error', emit: 'stdout' },
        { level: 'warn', emit: 'stdout' },
      ],
    });

    // Add query logging in development
    if (process.env.NODE_ENV === 'development') {
      globalForPrisma.prisma.$on('query', (e) => {
        console.log('\n--- Prisma Query ---');
        console.log('Query:  ', e.query);
        console.log('Params: ', e.params);
        console.log('Duration:', e.duration, 'ms\n');
      });
    }

    // Test the connection
    globalForPrisma.prisma.$connect()
      .then(() => console.log('Successfully connected to the database'))
      .catch(err => console.error('Failed to connect to the database:', err));
  }

  return globalForPrisma.prisma;
};

// Export the Prisma client
export const prisma = getPrismaClient();

export default prisma;
