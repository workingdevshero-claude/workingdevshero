# WorkingDevsHero

AI Application Development as a Service - Pay with Solana, get results via email.

## Overview

WorkingDevsHero is a web application that allows users to submit development tasks to be completed by Claude Code AI. Users pay with Solana cryptocurrency at a rate of $6/hour ($0.10/minute), and receive their completed tasks via email.

## Features

- **Marketing Landing Page**: Beautiful, responsive landing page showcasing the service
- **Task Submission Form**: Easy-to-use form for submitting development tasks
- **Solana Payments**: Secure cryptocurrency payments with real-time verification
- **Work Queue**: Automated queue processing for paid tasks
- **Claude Code Integration**: Tasks are executed by Claude Code CLI
- **Email Notifications**: Results delivered directly to your inbox

## Tech Stack

- **Runtime**: Bun
- **Framework**: Hono
- **Database**: SQLite (bun:sqlite)
- **Blockchain**: Solana (via @solana/web3.js)
- **Email**: Nodemailer

## Setup

1. Install dependencies:
```bash
bun install
```

2. Start the web server:
```bash
bun run start
```

3. Start the worker (processes paid tasks):
```bash
bun run worker
```

## Environment Variables

- `PORT` - Server port (default: 3000)
- `SOLANA_RPC_URL` - Solana RPC endpoint (default: mainnet-beta)
- `SMTP_HOST` - SMTP server host
- `SMTP_PORT` - SMTP server port
- `SMTP_USER` - SMTP username
- `SMTP_PASS` - SMTP password

## Pricing

- **Rate**: $6/hour = $0.10/minute
- **Time Limit**: 1-120 minutes per task
- **Payment**: Solana (SOL)

## Payment Wallet

Solana Address: `4ym27TW1CzsV42sFvbMwSMRwiWsEu5tHFkeYJYoqozcf`

## License

Proprietary - WorkingDevsHero.com
