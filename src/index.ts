import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { z } from 'zod'
import { prisma } from './db/prisma'
import { ticketQueue } from './queue/ticket.queue' 

const app = new Hono()

const ticketSchema = z.object({
  message: z.string().min(1),
})

app.get('/', (c) => {
  return c.json({
    service: 'Ticket Intelligence API',
    status: 'ok',
  })
})

app.post('/tickets', async (c) => {
  let ticketId: string | undefined

  try {
    const body = await c.req.json()

    const result = ticketSchema.safeParse(body)

    if (!result.success) {
      return c.json(
        {
          error: 'Invalid ticket',
          details: result.error.issues,
        },
        400
      )
    }

    const ticket = await prisma.ticket.create({
      data: {
        message: result.data.message,
        status: 'PENDING',
      },
    })

    ticketId = ticket.id

    try {
      await ticketQueue.add('process-ticket', {
        ticketId: ticket.id,
      })
    } catch (queueError) {
      await prisma.ticket.update({
        where: {
          id: ticket.id,
        },
        data: {
          status: 'FAILED',
          error: 'Failed to enqueue ticket for processing',
        },
      })

      throw queueError
    }

    return c.json(
      {
        id: ticket.id,
        status: ticket.status,
      },
      202
    )
  } catch (error) {
    console.error('Failed to create ticket:', error)

    return c.json(
      {
        error: 'Failed to create ticket',
        ticketId,
      },
      500
    )
  }
})

app.get('/tickets/:id', async (c) => {
  try {
    const id = c.req.param('id')

    const ticket = await prisma.ticket.findUnique({
      where: {
        id,
      },
    })

    if (!ticket) {
      return c.json(
        {
          error: 'Ticket not found',
        },
        404
      )
    }

    return c.json({
      id: ticket.id,
      message: ticket.message,
      status: ticket.status,
      result: ticket.result,
      error: ticket.error,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
    })
  } catch (error) {
    console.error('Failed to get ticket:', error)

    return c.json(
      {
        error: 'Failed to get ticket',
      },
      500
    )
  }
})

serve({
  fetch: app.fetch,
  port: 3000,
})