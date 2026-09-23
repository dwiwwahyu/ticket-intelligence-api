import { ticketQueue } from './ticket.queue'

async function main() {
  const job = await ticketQueue.add('process-ticket', {
    ticketId: 'cbf64ef9-b938-44f0-a77e-6a7b6759ea86',
  })

  console.log('Job created!')
  console.log('Job ID:', job.id)

  await ticketQueue.close()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})