export type ContractType = "daily" | "weekly" | "monthly";
export type ContractStatus = "active" | "extended" | "overdue" | "closing" | "closed" | "immobilised";
export type Tier = "tier1" | "tier2" | "tier3" | "tier4" | "aggregator" | "override" | "active";
export type Priority = "low" | "normal" | "high" | "urgent";
export type TaskStatus = "open" | "in_progress" | "completed" | "cancelled";
export type TeamMember = "sree" | "ann" | "rachel" | "fairoos" | "karar" | "ops";

export interface Contract {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  vehiclePlate: string;
  vehicleModel: string;
  contractType: ContractType;
  sourceCode: string;
  startDate: string;
  endDate: string;
  dailyRate: number;
  totalAmount: number;
  outstandingAmount: number;
  salikCharges: number;
  darbCharges: number;
  fineCharges: number;
  depositAmount: number;
  status: ContractStatus;
  tier: Tier;
  assignedTo: TeamMember | null;
  manualOverride: boolean;
  overrideReason: string | null;
  overrideUntil: string | null;
  lastContacted: string | null;
  lastResponse: string | null;
}

export interface Task {
  id: string;
  contractId: string | null;
  customerId: string | null;
  customerName?: string;
  assignedTo: TeamMember;
  taskType: string;
  description: string;
  priority: Priority;
  status: TaskStatus;
  dueDate: string;
  createdAt: string;
  completedAt: string | null;
}

export interface Escalation {
  id: string;
  contractId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  vehicle: string;
  escalationType: string;
  triggerTime: string;
  callOutcome: string | null;
  resolved: boolean;
}

export interface TimelineEvent {
  id: string;
  type: "message" | "event" | "payment" | "call";
  direction?: "outbound" | "inbound";
  channel?: string;
  template?: string;
  contractId: string | null;
  customerName?: string;
  detail: string;
  actor: string;
  time: string;
}

export interface DashboardStats {
  expiringToday: number;
  contacted: number;
  responded: number;
  extended: number;
  returning: number;
  overdue: number;
  closed: number;
  immobilised: number;
  messagesSent: number;
  totalContracts: number;
}

export interface Receivables {
  totalAed: number;
  totalCount: number;
  byDaysOverdue: Record<string, number>;
  byOwner: { name: string; count: number; total: number }[];
}

export interface TeamWorkload {
  [key: string]: {
    total: number;
    urgent: number;
    high: number;
    normal: number;
  };
}
