import 'dotenv/config'
import { Worker } from 'bullmq'
import { redisConnection } from './queue/redis'
import { prisma } from './db/prisma'
import { classifyTicket } from './ticket-triage/index'

const worker = new Worker(
  'ticket-processing',
  async (job) => {
    console.log('\n=== PROCESSING JOB ===')
    console.log('Job ID:', job.id)

    const ticketId = job.data.ticketId

    console.log('Ticket ID:', ticketId)

    // 1. Find the ticket in PostgreSQL
    const ticket = await prisma.ticket.findUnique({
      where: {
        id: ticketId,
      },
    })

    if (!ticket) {
      throw new Error(`Ticket ${ticketId} not found`)
    }

    // 2. Mark ticket as PROCESSING
    await prisma.ticket.update({
      where: {
        id: ticketId,
      },
      data: {
        status: 'PROCESSING',
      },
    })

    console.log('Ticket status: PROCESSING')

    try {
      // 3. Send the ticket to the AI classifier
      const result = await classifyTicket(ticket.message)

      console.log('\n=== AI RESULT ===')
      console.log(result)

      // 4. Save the AI result
      await prisma.ticket.update({
        where: {
          id: ticketId,
        },
        data: {
          status: 'COMPLETED',
          result,
        },
      })

      console.log('Ticket status: COMPLETED')

      return result
    } catch (error) {
  const errorMessage =
    error instanceof Error
      ? error.message
      : 'Unknown processing error'

  console.error('Ticket processing failed')
  console.error(error)

  const willRetry = job.attemptsMade < 2

  await prisma.ticket.update({
    where: {
      id: ticketId,
    },
    data: {
      status: willRetry ? 'PENDING' : 'FAILED',
      error: errorMessage,
    },
  })

  throw error
}
  },
  {
    connection: redisConnection,
  }
)

worker.on('completed', (job) => {
  console.log(`\nJob ${job.id} completed`)
})

worker.on('failed', (job, error) => {
  console.error(`\nJob ${job?.id} failed`)
  console.error(error)
})

console.log('Ticket worker is running...')