import "dotenv/config";
import { Agent } from "@anvia/core";
import { OpenAIClient } from "@anvia/openai";
import { z } from "zod";

// ----------------------------------------
// 1. Connect to the AI model
// ----------------------------------------

const client = new OpenAIClient({
  apiKey: process.env.MUX_API_KEY!,
  baseUrl: process.env.MUX_BASE_URL!,
});

const model = client.completionModel({
  modelId: process.env.MODEL_ID!,
  api: "chat",
});

// ----------------------------------------
// 2. Define the expected ticket structure
// ----------------------------------------

export const TicketSchema = z.object({
  category: z.enum([
    "account_access",
    "billing",
    "technical_issue",
    "other",
  ]),

  priority: z.enum([
    "low",
    "medium",
    "high",
  ]),

  impact: z.enum([
    "low",
    "medium",
    "high",
  ]),

  customerTier: z.enum([
    "standard",
    "premium",
    "enterprise",
  ]),
});

// ----------------------------------------
// 3. Create the AI classifier
// ----------------------------------------

const classifier = new Agent({
  id: "ticket-classifier",
  model,

  instructions: `
You are a customer support ticket classifier.

Read the customer's ticket and classify it into these fields:

- category
- priority
- impact
- customerTier

Allowed category values:
- account_access
- billing
- technical_issue
- other

Allowed priority values:
- low
- medium
- high

Allowed impact values:
- low
- medium
- high

Allowed customerTier values:
- standard
- premium
- enterprise

Do not use alternative words such as:
- urgent
- critical
- severe
- normal

Return only valid JSON.
`,

  maxTurns: 1,
});

// ----------------------------------------
// 4. Classify a ticket
// ----------------------------------------

export async function classifyTicket(ticket: string) {
  console.log("\n=== SUPPORT TICKET ===\n");
  console.log(ticket);

  const result = await classifier.generate({
    prompt: `
Extract the structured information from this support ticket.

Ticket:

${ticket}

Return JSON with exactly these fields:

{
  "category": "...",
  "priority": "...",
  "impact": "...",
  "customerTier": "..."
}
`,
  });

  // ----------------------------------------
  // 5. Make sure the AI returned a response
  // ----------------------------------------

  if (result.type !== "response") {
    throw new Error("Classifier did not return a response");
  }

  console.log("\n=== RAW AI OUTPUT ===\n");
  console.log(result.output);

  // ----------------------------------------
  // 6. Parse AI text
  // ----------------------------------------

  const parsed = JSON.parse(result.output);

  // ----------------------------------------
  // 7. Normalize unexpected AI values
  // ----------------------------------------

  if (
    parsed.priority === "urgent" ||
    parsed.priority === "critical"
  ) {
    parsed.priority = "high";
  }

  if (parsed.impact === "critical") {
    parsed.impact = "high";
  }

  // ----------------------------------------
  // 8. Validate with Zod
  // ----------------------------------------

  const ticketData = TicketSchema.parse(parsed);

  // ----------------------------------------
  // 9. Deterministic routing logic
  // ----------------------------------------

  const destination = routeTicket(ticketData);

  return {
    ...ticketData,
    destination,
  };
}

// ----------------------------------------
// 10. Deterministic routing
// ----------------------------------------

function routeTicket(
  ticket: z.infer<typeof TicketSchema>,
): string {

  if (
    ticket.priority === "high" &&
    ticket.customerTier === "enterprise"
  ) {
    return "enterprise-priority-support";
  }

  if (
    ticket.priority === "high" &&
    ticket.impact === "high"
  ) {
    return "priority-support";
  }

  if (ticket.category === "billing") {
    return "billing-support";
  }

  if (ticket.category === "technical_issue") {
    return "technical-support";
  }

  return "general-support";
}