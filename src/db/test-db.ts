import { prisma } from './prisma'

async function main() {
  const tickets = await prisma.ticket.findMany()

  console.log('Database connected!')
  console.log('Tickets:', tickets)
}

main()
  .catch((error) => {
    console.error('Database connection failed:')
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })