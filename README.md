# Ticket Intelligence API

An asynchronous customer support ticket processing API built with Hono, PostgreSQL, Redis, BullMQ, Prisma, and Anvia.

## Architecture

```text
Client
  |
  | POST /tickets
  v
Hono API
  |
  +----> PostgreSQL
  |       |
  |       └── Ticket: PENDING
  |
  +----> BullMQ
          |
          v
        Redis
          |
          v
       Worker
          |
          v
   Anvia Ticket Agent
          |
          v
   Ticket Classification
          |
          v
      PostgreSQL
          |
          └── Ticket: COMPLETED