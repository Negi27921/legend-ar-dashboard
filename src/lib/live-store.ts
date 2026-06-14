import { Contract, Task, Escalation, TimelineEvent, DashboardStats, Receivables, TeamWorkload } from "./types";
import { sampleContracts, sampleStats, sampleReceivables, sampleTasks, sampleEscalations, sampleTimeline, sampleWorkload } from "./sample-data";
import { todayStr, daysDiff } from "./utils";

const AGGREGATOR_SOURCES = ["YANGO", "CAREEM", "NOON_MINUTES", "DELIVEROO"];

interface LiveStore {
  contracts: Contract[];
  tasks: Task[];
  escalations: Escalation[];
  timeline: TimelineEvent[];
  lastScraped: string | null;
  source: "sample" | "speed_live";
}

let store: LiveStore = {
  contracts: sampleContracts,
  tasks: sampleTasks,
  escalations: sampleEscalations,
  timeline: sampleTimeline,
  lastScraped: null,
  source: "sample",
};

function classifyTier(contract: Contract): Contract["tier"] {
  const source = (contract.sourceCode || "").toUpperCase();
  if (AGGREGATOR_SOURCES.includes(source)) return "aggregator";
  if (contract.manualOverride) return "override";

  const today = todayStr();
  const endDate = contract.endDate;
  if (!endDate) return "active";

  // daysDiff returns (today - endDate): positive = overdue, negative = future, 0 = today
  const diff = daysDiff(endDate);
  if (diff > 0) {
    // Contract end date is in the past → overdue
    if (diff >= 4) return "tier4";
    return "tier3";
  }
  if (diff === 0) return "tier1"; // expiring today
  if (Math.abs(diff) <= 3) return "tier2"; // expiring within 3 days
  return "active";
}

function assignTeamMember(tier: Contract["tier"]): Contract["assignedTo"] {
  switch (tier) {
    case "tier1": case "tier2": return "sree";
    case "tier3": return "fairoos";
    case "tier4": return "karar";
    case "aggregator": return "ops";
    default: return "sree";
  }
}

export function ingestSpeedContracts(rawContracts: Record<string, string>[]): Contract[] {
  const fieldMap: Record<string, string[]> = {
    id: ["contract_id", "contract_no", "agreement_no", "agreement_number", "contract_number", "contract_#", "agreement_#", "rental_no", "ra_no", "ra_number", "no", "id", "number"],
    customerName: ["customer_name", "customer", "name", "client_name", "client", "renter_name", "renter", "driver_name", "driver"],
    customerPhone: ["phone", "mobile", "phone_number", "mobile_number", "customer_phone", "contact", "contact_number", "tel"],
    customerEmail: ["email", "customer_email", "e-mail", "e_mail"],
    vehiclePlate: ["plate", "plate_number", "vehicle_plate", "plate_no", "reg_no", "registration", "license_plate", "vehicle_no"],
    vehicleModel: ["vehicle", "vehicle_model", "model", "car", "car_model", "vehicle_type", "description"],
    startDate: ["start_date", "checkout_date", "check_out", "from_date", "from", "pickup_date", "rental_start", "start"],
    endDate: ["end_date", "return_date", "due_date", "expiry_date", "expiry", "to_date", "to", "expected_return", "due", "checkin_date", "check_in"],
    dailyRate: ["daily_rate", "rate", "daily_amount", "rent_per_day", "rate/day", "daily_rent", "rent"],
    totalAmount: ["total_amount", "total", "amount", "gross_amount", "net_amount", "rental_amount"],
    outstandingAmount: ["outstanding", "balance", "outstanding_amount", "due_amount", "amount_due", "receivable", "pending"],
    depositAmount: ["deposit", "security_deposit", "deposit_amount"],
    status: ["status", "contract_status", "rental_status", "state"],
    sourceCode: ["source", "source_code", "channel", "booking_source", "agent", "aggregator"],
    contractType: ["type", "contract_type", "rental_type", "rate_type"],
    salikCharges: ["salik", "salik_charges", "toll"],
    fineCharges: ["fines", "fine_charges", "traffic_fines"],
  };

  function findField(row: Record<string, string>, candidates: string[]): string {
    for (const c of candidates) {
      if (row[c] !== undefined && row[c] !== "") return String(row[c]);
    }
    return "";
  }

  const contracts: Contract[] = rawContracts.map((row, idx) => {
    const c: Contract = {
      id: findField(row, fieldMap.id) || `SPD-${idx + 1}`,
      customerId: `CU-${idx + 1000}`,
      customerName: findField(row, fieldMap.customerName),
      customerPhone: normalizePhone(findField(row, fieldMap.customerPhone)),
      customerEmail: findField(row, fieldMap.customerEmail),
      vehiclePlate: findField(row, fieldMap.vehiclePlate),
      vehicleModel: findField(row, fieldMap.vehicleModel),
      contractType: parseContractType(findField(row, fieldMap.contractType)),
      sourceCode: findField(row, fieldMap.sourceCode).toUpperCase() || "DIRECT",
      startDate: parseDate(findField(row, fieldMap.startDate)),
      endDate: parseDate(findField(row, fieldMap.endDate)),
      dailyRate: parseNum(findField(row, fieldMap.dailyRate)),
      totalAmount: parseNum(findField(row, fieldMap.totalAmount)),
      outstandingAmount: parseNum(findField(row, fieldMap.outstandingAmount)),
      salikCharges: parseNum(findField(row, fieldMap.salikCharges)),
      darbCharges: 0,
      fineCharges: parseNum(findField(row, fieldMap.fineCharges)),
      depositAmount: parseNum(findField(row, fieldMap.depositAmount)),
      status: parseStatus(findField(row, fieldMap.status)),
      tier: "active",
      assignedTo: null,
      manualOverride: false,
      overrideReason: null,
      overrideUntil: null,
      lastContacted: null,
      lastResponse: null,
    };
    c.tier = classifyTier(c);
    c.assignedTo = assignTeamMember(c.tier);
    return c;
  }).filter(c => c.customerName || c.vehiclePlate);

  return contracts;
}

function normalizePhone(phone: string): string {
  if (!phone) return "";
  let p = String(phone).replace(/[\s\-()]/g, "");
  if (p.startsWith("00")) p = "+" + p.slice(2);
  if (p.startsWith("971")) p = "+" + p;
  if (p.startsWith("05") || p.startsWith("5")) p = "+971" + (p.startsWith("0") ? p.slice(1) : p);
  if (p && !p.startsWith("+")) p = "+971" + p;
  return p;
}

function parseDate(d: string): string {
  if (!d) return todayStr();
  const cleaned = String(d).replace(/\//g, "-").trim();
  const iso = new Date(cleaned);
  if (!isNaN(iso.getTime())) return iso.toISOString().split("T")[0];
  const parts = cleaned.split("-");
  if (parts.length === 3) {
    if (parts[0].length === 4) return cleaned;
    return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
  }
  return todayStr();
}

function parseNum(s: string | number): number {
  if (s === undefined || s === null || s === "") return 0;
  if (typeof s === "number") return s;
  const n = parseFloat(String(s).replace(/[^0-9.\-]/g, ""));
  return isNaN(n) ? 0 : n;
}

function parseContractType(t: string): Contract["contractType"] {
  if (!t) return "daily";
  const lower = String(t).toLowerCase();
  if (lower.includes("month")) return "monthly";
  if (lower.includes("week")) return "weekly";
  return "daily";
}

function parseStatus(s: string): Contract["status"] {
  if (!s) return "active";
  const lower = String(s).toLowerCase();
  // "due_to_close" means expiring soon, NOT already closed
  if (lower.includes("due_to_close") || lower.includes("due to close")) return "active";
  if (lower.includes("closed") || lower.includes("completed") || lower === "close") return "closed";
  if (lower.includes("overdue") || lower.includes("over_due") || lower.includes("over due") || lower.includes("expired")) return "overdue";
  if (lower.includes("extend")) return "extended";
  return "active";
}

export function computeStats(contracts: Contract[]): DashboardStats {
  const active = contracts.filter(c => c.status !== "closed");
  return {
    expiringToday: active.filter(c => c.tier === "tier1").length,
    contacted: active.filter(c => c.lastContacted).length,
    responded: active.filter(c => c.lastResponse).length,
    extended: active.filter(c => c.status === "extended").length,
    returning: active.filter(c => c.status === "closing").length,
    overdue: active.filter(c => c.tier === "tier3" || c.tier === "tier4").length,
    closed: contracts.filter(c => c.status === "closed").length,
    immobilised: contracts.filter(c => c.status === "immobilised").length,
    messagesSent: active.filter(c => c.lastContacted).length * 2,
    totalContracts: active.length,
  };
}

export function computeReceivables(contracts: Contract[]): Receivables {
  const withOutstanding = contracts.filter(c => c.outstandingAmount > 0 && c.status !== "closed");
  const today = todayStr();

  const byDays: Record<string, number> = { "0": 0, "1-3": 0, "4-7": 0, "8-14": 0, "15+": 0 };
  withOutstanding.forEach(c => {
    const diff = Math.abs(daysDiff(c.endDate));
    if (diff === 0) byDays["0"]++;
    else if (diff <= 3) byDays["1-3"]++;
    else if (diff <= 7) byDays["4-7"]++;
    else if (diff <= 14) byDays["8-14"]++;
    else byDays["15+"]++;
  });

  const ownerMap: Record<string, { count: number; total: number }> = {};
  withOutstanding.forEach(c => {
    const owner = c.assignedTo || "unassigned";
    if (!ownerMap[owner]) ownerMap[owner] = { count: 0, total: 0 };
    ownerMap[owner].count++;
    ownerMap[owner].total += c.outstandingAmount;
  });

  return {
    totalAed: withOutstanding.reduce((s, c) => s + c.outstandingAmount, 0),
    totalCount: withOutstanding.length,
    byDaysOverdue: byDays,
    byOwner: Object.entries(ownerMap).map(([name, d]) => ({ name, ...d })),
  };
}

export function computeWorkload(contracts: Contract[], tasks: Task[]): TeamWorkload {
  const members = ["sree", "ann", "rachel", "fairoos", "karar", "ops"];
  const workload: TeamWorkload = {};
  members.forEach(m => {
    const memberTasks = tasks.filter(t => t.assignedTo === m && t.status !== "completed");
    workload[m] = {
      total: memberTasks.length + contracts.filter(c => c.assignedTo === m && c.status !== "closed").length,
      urgent: memberTasks.filter(t => t.priority === "urgent").length,
      high: memberTasks.filter(t => t.priority === "high").length,
      normal: memberTasks.filter(t => t.priority === "normal").length,
    };
  });
  return workload;
}

export function generateTasksFromContracts(contracts: Contract[]): Task[] {
  const tasks: Task[] = [];
  const now = new Date().toISOString();

  contracts.forEach(c => {
    if (c.status === "closed") return;

    if (c.tier === "tier3" || c.tier === "tier4") {
      tasks.push({
        id: `T-${c.id}`,
        contractId: c.id,
        customerId: c.customerId,
        customerName: c.customerName,
        assignedTo: c.assignedTo || "sree",
        taskType: c.tier === "tier4" ? "recovery" : "collection",
        description: `${c.customerName} — ${c.vehicleModel} (${c.vehiclePlate}) — ${Math.abs(daysDiff(c.endDate))} days overdue. Outstanding: AED ${c.outstandingAmount.toFixed(0)}`,
        priority: c.tier === "tier4" ? "urgent" : "high",
        status: "open",
        dueDate: todayStr(),
        createdAt: now,
        completedAt: null,
      });
    }

    if (c.tier === "tier1") {
      tasks.push({
        id: `T-EXP-${c.id}`,
        contractId: c.id,
        customerId: c.customerId,
        customerName: c.customerName,
        assignedTo: "sree",
        taskType: "expiry_followup",
        description: `Contract expiring today — ${c.customerName} — ${c.vehicleModel} (${c.vehiclePlate})`,
        priority: "high",
        status: "open",
        dueDate: todayStr(),
        createdAt: now,
        completedAt: null,
      });
    }

    if (c.tier === "aggregator") {
      tasks.push({
        id: `T-AGG-${c.id}`,
        contractId: c.id,
        customerId: c.customerId,
        customerName: c.customerName,
        assignedTo: "ops",
        taskType: "aggregator_review",
        description: `Aggregator (${c.sourceCode}) — ${c.vehicleModel} (${c.vehiclePlate}) — manual review required`,
        priority: "normal",
        status: "open",
        dueDate: todayStr(),
        createdAt: now,
        completedAt: null,
      });
    }
  });

  return tasks;
}

export function getStore() { return store; }

export function updateStore(contracts: Contract[]) {
  const tasks = generateTasksFromContracts(contracts);
  store = {
    contracts,
    tasks,
    escalations: [],
    timeline: generateTimeline(contracts),
    lastScraped: new Date().toISOString(),
    source: "speed_live",
  };
  return store;
}

function generateTimeline(contracts: Contract[]): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const now = new Date();

  contracts.forEach(c => {
    if (c.tier === "tier1") {
      events.push({
        id: `TL-T1-${c.id}`, type: "message", direction: "outbound", channel: "whatsapp",
        template: "Template A", contractId: c.id, customerName: c.customerName,
        detail: `Template A sent — contract expiring today`, actor: "system",
        time: new Date(now.getTime() - 3600000).toISOString(),
      });
    }
    if (c.tier === "tier2") {
      events.push({
        id: `TL-T2-${c.id}`, type: "message", direction: "outbound", channel: "whatsapp",
        template: "Template B", contractId: c.id, customerName: c.customerName,
        detail: `Template B sent — expiring in ${Math.abs(daysDiff(c.endDate))} days`, actor: "system",
        time: new Date(now.getTime() - 7200000).toISOString(),
      });
    }
    if (c.tier === "tier3") {
      events.push({
        id: `TL-T3-${c.id}`, type: "message", direction: "outbound", channel: "whatsapp",
        template: "Template C", contractId: c.id, customerName: c.customerName,
        detail: `Template C sent — ${Math.abs(daysDiff(c.endDate))} days overdue, AED ${c.outstandingAmount.toFixed(0)}`, actor: "system",
        time: new Date(now.getTime() - 1800000).toISOString(),
      });
    }
    if (c.tier === "tier4") {
      events.push({
        id: `TL-T4-${c.id}`, type: "message", direction: "outbound", channel: "whatsapp",
        template: "Template D", contractId: c.id, customerName: c.customerName,
        detail: `Template D — FINAL NOTICE, ${Math.abs(daysDiff(c.endDate))} days overdue, AED ${c.outstandingAmount.toFixed(0)}`, actor: "system",
        time: new Date(now.getTime() - 900000).toISOString(),
      });
    }
    if (c.tier === "aggregator") {
      events.push({
        id: `TL-AGG-${c.id}`, type: "event", contractId: c.id, customerName: c.customerName,
        detail: `Aggregator contract (${c.sourceCode}) flagged for manual review`, actor: "system",
        time: new Date(now.getTime() - 5400000).toISOString(),
      });
    }
  });

  return events.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
}

export function resetToSample() {
  store = {
    contracts: sampleContracts,
    tasks: sampleTasks,
    escalations: sampleEscalations,
    timeline: sampleTimeline,
    lastScraped: null,
    source: "sample",
  };
}
