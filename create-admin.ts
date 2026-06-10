import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const hash = await bcrypt.hash('Bharath25', 12)
  const user = await prisma.user.upsert({
    where: { email: 'bharathprasad@aeonsynergies.com' },
    update: { hashedPassword: hash },
    create: {
      email: 'bharathprasad@aeonsynergies.com',
      hashedPassword: hash,
      name: 'Bharath Prasad G',
      role: 'ADMIN',
      isActive: true
    }
  })
  console.log('✓ Admin user ready:', user.email)
  await prisma.$disconnect()
}

main().catch(console.error)
