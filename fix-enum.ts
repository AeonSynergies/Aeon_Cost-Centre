import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const result = await prisma.$executeRaw`
    UPDATE "Department" 
    SET category = 'BUSINESS_DEVELOPMENT' 
    WHERE category = 'PRODUCT_DEVELOPMENT'
  `
  console.log('Updated rows:', result)
  await prisma.$disconnect()
}
main().catch(console.error)
