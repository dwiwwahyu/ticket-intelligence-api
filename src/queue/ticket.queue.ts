import { Queue } from 'bullmq'
import { redisConnection } from './redis'

export const ticketQueue = new Queue('ticket-processing', {
connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 100,
    removeOnFail: 100,
  },
})