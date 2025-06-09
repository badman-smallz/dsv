import { PrismaClient } from '@prisma/client'

// Create a type for our global prisma instance
type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>

// Define the global namespace
declare global {
  var prisma: PrismaClientSingleton | undefined
}

// Function to create or return existing PrismaClient
const prismaClientSingleton = () => {
  return new PrismaClient()
}

// Initialize the prisma instance
const prismaInstance = globalThis.prisma ?? prismaClientSingleton()

// Store in globalThis in development to prevent hot-reload issues
if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prismaInstance
}

// Export the prisma instance
export default prismaInstance

