# Legend AR Command Center — System Flow

## Architecture Overview

```
+========================+          +========================+          +========================+
|     SPEED AUTO ERP     |          |    LEGEND AR DASHBOARD |          |     GALLABOX API       |
|  (Source of Truth)     |          |    (Next.js on Vercel) |          |  (WhatsApp Business)   |
+========================+          +========================+          +========================+
| legenduae.             |          | legend-ar-dashboard    |          | server.gallabox.com    |
| speedautosystems.com   |          | .vercel.app            |          | /devapi/messages/      |
+========================+          +========================+          +========================+
         |                                    |                                    |
         |  1. DATA INGESTION                 |                                    |
         |----------------------------------->|                                    |
         |  (Manual Excel Upload OR           |                                    |
         |   Browser Scrape OR                |                                    |
         |   4AM Vercel Cron)                 |                                    |
         |                                    |                                    |
         |                                    |  2. WHATSAPP REMINDERS             |
         |                                    |----------------------------------->|
         |                                    |  POST /api/whatsapp/send           |
         |                                    |  {phone, customerName, template}   |
         |                                    |                                    |
         |                                    |<-----------------------------------|
         |                                    |  {success/error}                   |
         |                                    |                                    |
```

---

## Data Flow Diagram

```
                    +-------------------+
                    |   SPEED AUTO ERP  |
                    | (ASP.NET Web App) |
                    +--------+----------+
                             |
              +--------------+--------------+
              |              |              |
              v              v              v
     +--------+--+  +--------+--+  +--------+--------+
     | MANUAL    |  | BROWSER   |  | AUTOMATED CRON  |
     | UPLOAD    |  | SCRAPE    |  | (4 AM Dubai)    |
     | .xlsx/.csv|  | JS Extract|  | /api/cron       |
     +-----------+  +-----------+  +-----------------+
              |              |              |
              v              v              v
     +--------+--+  +--------+---------+--------+
     | POST       |  | Direct Supabase           |
     | /api/upload |  | REST API Upsert           |
     +------+------+  +----------+----------------+
            |                    |
            v                    v
     +------+--------------------+------+
     |         SUPABASE POSTGRES        |
     |   ohwgibzmaxfxivenbfhm.supabase  |
     +----------------------------------+
     |                                  |
     |  contracts          (271+ rows)  |
     |  ├─ agreement_no    (unique key) |
     |  ├─ customer_name               |
     |  ├─ contact_number              |
     |  ├─ vehicle_no / make_model     |
     |  ├─ start_date / end_date       |
     |  ├─ outstanding_amount          |
     |  ├─ category (due/overdue)      |
     |  ├─ call_status                 |
     |  ├─ whatsapp_status             |
     |  ├─ action_taken                |
     |  └─ notes                       |
     |                                  |
     |  upload_history     (audit log)  |
     |  action_log         (audit log)  |
     +----------------+-----------------+
                      |
                      v
     +----------------+-----------------+
     |      NEXT.JS DASHBOARD           |
     |      (React 19 + Recharts)       |
     +----------------------------------+
     |                                  |
     |  VIEWS:                          |
     |  ├─ Overview (KPIs + Charts)     |
     |  ├─ Contracts (Table + Filters)  |
     |  └─ Upload (File Import)         |
     |                                  |
     |  FEATURES:                       |
     |  ├─ Cmd+K Command Palette       |
     |  ├─ Click-to-filter KPI cards   |
     |  ├─ Dark/Light mode toggle      |
     |  ├─ Call status tracking        |
     |  ├─ WhatsApp send via GallaBox  |
     |  └─ Resolution management       |
     +----------------+-----------------+
                      |
                      v
     +----------------+-----------------+
     |       GALLABOX WHATSAPP API      |
     +----------------------------------+
     |  POST /devapi/messages/whatsapp  |
     |  ├─ channelId                   |
     |  ├─ recipient.phone             |
     |  ├─ template: contract_reminder |
     |  └─ bodyValues: {name}          |
     +----------------------------------+
```

---

## Ingestion Paths (3 Methods)

### Path 1: Manual Excel/CSV Upload
```
User exports Excel from Speed ERP
         |
         v
Drags file into Dashboard Upload page
         |
         v
POST /api/upload  (FormData: file + category)
         |
         v
excel-parser.ts parses file (xlsx library)
  ├─ Maps ~40 Speed ERP column header variations
  ├─ Handles date formats (Excel serial, DD/MM/YYYY, ISO)
  └─ Extracts: agreement_no, customer, phone, vehicle, amounts
         |
         v
supabase.upsertContracts()
  ├─ New rows → INSERT
  ├─ Existing rows → UPDATE (preserves call/whatsapp/action status)
  └─ Logs to upload_history
```

### Path 2: Browser-Based Scrape (On-Demand)
```
User logs into Speed ERP in browser
         |
         v
Claude clicks "Due To Close Today" / "Over Due Closing"
         |
         v
JavaScript extracts data from Angular ui-grid scope
  └─ api.grid.rows[].entity → 201 + 70 rows
         |
         v
Direct Supabase REST API upsert
  POST /rest/v1/contracts?on_conflict=agreement_no
  Header: Prefer: resolution=merge-duplicates
  └─ Batches of 50 rows
```

### Path 3: Automated Cron (Daily 4 AM Dubai / 00:00 UTC)
```
Vercel Cron triggers GET /api/cron
         |
         v
Login to Speed ERP API
  POST /Account/LoginNew
  └─ Credentials from env vars (SPEED_ERP_URL/EMAIL/PASSWORD)
         |
         v
Fetch active contracts
  ├─ Due to close today
  └─ Overdue contracts
         |
         v
supabase.upsertContracts()
  └─ batch_id: "cron-YYYY-MM-DD"
```

---

## Action Flow (Dashboard Operations)

```
Dashboard User
    |
    |── View contract in table
    |      └─ Phone number visible upfront (clickable tel: link)
    |
    |── Mark Call Status ──────────────────────────────────────┐
    |   ├─ Called                                              |
    |   ├─ No Answer                                          |
    |   └─ Callback                                           |
    |                                                          v
    |                                              POST /api/actions
    |                                              {contractId, action: "call_status", value}
    |                                                          |
    |                                                          v
    |                                              Supabase UPDATE contracts
    |                                              + INSERT action_log
    |
    |── Send WhatsApp ─────────────────────────────────────────┐
    |                                                          |
    |                                                          v
    |                                              POST /api/whatsapp/send
    |                                              {contractId, phone, customerName}
    |                                                          |
    |                                                          v
    |                                              GallaBox API
    |                                              POST /devapi/messages/whatsapp
    |                                              {channelId, recipient, template}
    |                                                          |
    |                                                          v
    |                                              Supabase UPDATE whatsapp_status = "sent"
    |                                              + INSERT action_log
    |
    |── Set Resolution ────────────────────────────────────────┐
    |   ├─ Extended (contract renewed)                         |
    |   ├─ Returning (vehicle coming back)                     |
    |   ├─ Closed (agreement settled)                          |
    |   └─ Immobilised (vehicle locked)                        |
    |                                                          v
    |                                              POST /api/actions
    |                                              {contractId, action: "action_taken", value}
    |                                                          |
    |                                                          v
    |                                              Supabase UPDATE contracts
    |                                              + INSERT action_log
```

---

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/contracts` | Fetch contracts + stats (with filters) |
| `POST` | `/api/upload` | Upload Excel/CSV file → parse → upsert |
| `POST` | `/api/actions` | Update call_status / whatsapp_status / action_taken / notes |
| `POST` | `/api/whatsapp/send` | Send WhatsApp reminder via GallaBox |
| `GET` | `/api/cron` | Automated daily scrape (Vercel Cron) |
| `GET` | `/api/ingest` | Legacy data receiver (manual JSON paste) |

---

## Environment Variables

| Variable | Location | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `.env.local` | Supabase anonymous key |
| `SPEED_ERP_URL` | `.env.local` + Vercel | Speed ERP base URL |
| `SPEED_ERP_EMAIL` | `.env.local` + Vercel | Speed ERP login email |
| `SPEED_ERP_PASSWORD` | `.env.local` + Vercel | Speed ERP login password |
| `CRON_SECRET` | `.env.local` + Vercel | Auth token for cron endpoint |
| `GALLABOX_API_KEY` | Vercel only | GallaBox WhatsApp API key |
| `GALLABOX_API_SECRET` | Vercel only | GallaBox WhatsApp API secret |
| `GALLABOX_CHANNEL_ID` | Vercel only | GallaBox WhatsApp channel ID |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16.2.9, React 19.2.4, Tailwind CSS v4.3.1 |
| Charts | Recharts 3.8.1 (PieChart, BarChart) |
| Animations | Framer Motion |
| UI Primitives | Radix UI (dialog, dropdown, select, switch, tabs, toast, tooltip) |
| Database | Supabase Postgres (3 tables, RLS enabled) |
| File Parsing | xlsx library (Excel + CSV) |
| WhatsApp | GallaBox API (template-based messages) |
| Hosting | Vercel (auto-deploy from GitHub main branch) |
| Cron | Vercel Cron (daily 00:00 UTC = 4 AM Dubai) |
| Repo | github.com/Negi27921/legend-ar-dashboard |

---

## Database Schema

```sql
contracts (primary table)
├── id                UUID PK
├── agreement_no      TEXT UNIQUE        ← upsert key
├── contract_type     TEXT               ← Monthly/Weekly/Daily
├── vehicle_no        TEXT
├── make_model        TEXT
├── customer_name     TEXT
├── contact_number    TEXT
├── customer_email    TEXT
├── sales_person      TEXT
├── start_date        DATE
├── end_date          DATE
├── branch            TEXT
├── daily_rate        NUMERIC(12,2)
├── total_amount      NUMERIC(12,2)
├── outstanding_amount NUMERIC(12,2)
├── deposit_amount    NUMERIC(12,2)
├── category          TEXT               ← due_to_close_today / over_due_closing
├── call_status       TEXT DEFAULT 'not_called'
├── whatsapp_status   TEXT DEFAULT 'not_sent'
├── action_taken      TEXT DEFAULT 'none'
├── notes             TEXT
├── upload_batch      TEXT
├── last_updated      TIMESTAMPTZ
└── created_at        TIMESTAMPTZ

upload_history (audit)
├── batch_id          TEXT UNIQUE
├── filename          TEXT
├── category          TEXT
├── total_rows        INTEGER
├── new_rows          INTEGER
└── updated_rows      INTEGER

action_log (audit trail)
├── contract_id       UUID FK → contracts
├── agreement_no      TEXT
├── action_type       TEXT
├── old_value         TEXT
├── new_value         TEXT
└── performed_by      TEXT
```

---

## Status Values

| Field | Values |
|-------|--------|
| `category` | `due_to_close_today`, `over_due_closing` |
| `call_status` | `not_called`, `called`, `no_answer`, `callback` |
| `whatsapp_status` | `not_sent`, `sent`, `replied`, `failed` |
| `action_taken` | `none`, `extended`, `returning`, `closed`, `immobilised` |
