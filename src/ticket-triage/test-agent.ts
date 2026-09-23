import { classifyTicket } from './index'

async function main() {
  const result = await classifyTicket(
    'I was charged twice for my subscription and I need a refund.'
  )

  console.log('\n=== FINAL CLASSIFICATION ===\n')
  console.log(result)
}

main().catch((error) => {
  console.error('\n=== CLASSIFIER ERROR ===\n')
  console.error(error)
  process.exit(1)
})