import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ---------- Types ----------

export interface ContractRow {
  id: string;
  agreement_no: string;
  contract_type: string | null;
  vehicle_no: string | null;
  make_model: string | null;
  customer_name: string | null;
  contact_number: string | null;
  customer_email: string | null;
  sales_person: string | null;
  start_date: string | null;
  end_date: string | null;
  expected_date: string | null;
  branch: string | null;
  in_branch: string | null;
  collection_branch: string | null;
  daily_rate: number;
  total_amount: number;
  outstanding_amount: number;
  deposit_amount: number;
  category: string;
  call_status: "not_called" | "called" | "no_answer" | "callback";
  whatsapp_status: "not_sent" | "sent" | "replied" | "failed";
  action_taken: "none" | "extended" | "returning" | "closed" | "immobilised";
  notes: string | null;
  last_updated: string;
  uploaded_at: string;
  upload_batch: string | null;
  created_at: string;
}

export interface UploadHistoryRow {
  id: string;
  batch_id: string;
  filename: string | null;
  category: string | null;
  total_rows: number;
  new_rows: number;
  updated_rows: number;
  uploaded_at: string;
}

export interface ActionLogRow {
  id: string;
  contract_id: string;
  agreement_no: string | null;
  action_type: string;
  old_value: string | null;
  new_value: string | null;
  performed_by: string;
  created_at: string;
}

// ---------- Date-based category helpers ----------

/**
 * Dubai timezone (GST = UTC+4). All category logic uses Dubai date.
 */
function getTodayDubai(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" }); // YYYY-MM-DD
}

/**
 * Compute the correct category based on a contract's end_date relative to today (Dubai time).
 *  - end_date === today  → "due_to_close_today"
 *  - end_date < today    → "over_due_closing"
 *  - end_date > today or null → keep existing category (future contract still in system)
 */
function computeCategory(endDate: string | null, existingCategory: string): string {
  if (!endDate) return existingCategory;
  const today = getTodayDubai();
  const end = endDate.substring(0, 10); // normalise to YYYY-MM-DD
  if (end === today) return "due_to_close_today";
  if (end < today) return "over_due_closing";
  return existingCategory; // future date — keep as-is
}

/**
 * Apply live category to a contract row based on end_date vs today.
 * This ensures the dashboard always shows the correct status regardless
 * of when the contract was last scraped/uploaded.
 */
function applyLiveCategory(contract: ContractRow): ContractRow {
  const liveCategory = computeCategory(contract.end_date, contract.category);
  if (liveCategory !== contract.category) {
    return { ...contract, category: liveCategory };
  }
  return contract;
}

/**
 * Transition stale categories in Supabase.
 * - Contracts with category "due_to_close_today" whose end_date < today → "over_due_closing"
 * - Contracts with category "over_due_closing" whose end_date === today → "due_to_close_today"
 * Called automatically on each data fetch to keep the DB in sync.
 */
export async function transitionStaleCategories(): Promise<{ promoted: number; demoted: number }> {
  const today = getTodayDubai();
  let promoted = 0;
  let demoted = 0;

  // 1. Contracts marked "due_to_close_today" but end_date is before today → overdue
  const { data: staleToday } = await supabase
    .from("contracts")
    .select("id")
    .eq("category", "due_to_close_today")
    .lt("end_date", today);

  if (staleToday && staleToday.length > 0) {
    const ids = staleToday.map((c) => c.id);
    const { error } = await supabase
      .from("contracts")
      .update({ category: "over_due_closing", last_updated: new Date().toISOString() })
      .in("id", ids);
    if (!error) demoted = ids.length;
  }

  // 2. Contracts marked "over_due_closing" but end_date is exactly today → due today
  const { data: nowDueToday } = await supabase
    .from("contracts")
    .select("id")
    .eq("category", "over_due_closing")
    .eq("end_date", today);

  if (nowDueToday && nowDueToday.length > 0) {
    const ids = nowDueToday.map((c) => c.id);
    const { error } = await supabase
      .from("contracts")
      .update({ category: "due_to_close_today", last_updated: new Date().toISOString() })
      .in("id", ids);
    if (!error) promoted = ids.length;
  }

  return { promoted, demoted };
}

// ---------- Contract queries ----------

export async function getContracts(filters?: {
  category?: string;
  call_status?: string;
  whatsapp_status?: string;
  action_taken?: string;
  search?: string;
}) {
  // First, transition any stale categories in the DB
  await transitionStaleCategories();

  let query = supabase
    .from("contracts")
    .select("*")
    .order("end_date", { ascending: true });

  if (filters?.category && filters.category !== "all") {
    query = query.eq("category", filters.category);
  }
  if (filters?.call_status && filters.call_status !== "all") {
    query = query.eq("call_status", filters.call_status);
  }
  if (filters?.whatsapp_status && filters.whatsapp_status !== "all") {
    query = query.eq("whatsapp_status", filters.whatsapp_status);
  }
  if (filters?.action_taken && filters.action_taken !== "all") {
    query = query.eq("action_taken", filters.action_taken);
  }
  if (filters?.search) {
    query = query.or(
      `agreement_no.ilike.%${filters.search}%,customer_name.ilike.%${filters.search}%,vehicle_no.ilike.%${filters.search}%,contact_number.ilike.%${filters.search}%`
    );
  }

  const { data, error } = await query;
  if (error) throw error;

  // Apply live category computation as a safety net
  const rows = (data as ContractRow[]).map(applyLiveCategory);
  return rows;
}

export async function getDashboardStats() {
  // Transition stale categories before computing stats
  await transitionStaleCategories();

  const { data, error } = await supabase.from("contracts").select("*");
  if (error) throw error;

  // Apply live category to each contract for accurate stats
  const contracts = (data as ContractRow[]).map(applyLiveCategory);

  const dueToClose = contracts.filter((c) => c.category === "due_to_close_today");
  const overdue = contracts.filter((c) => c.category === "over_due_closing");

  return {
    totalContracts: contracts.length,
    dueToCloseToday: dueToClose.length,
    overdue: overdue.length,

    // Call status breakdown
    notCalled: contracts.filter((c) => c.call_status === "not_called").length,
    called: contracts.filter((c) => c.call_status === "called").length,
    noAnswer: contracts.filter((c) => c.call_status === "no_answer").length,
    callback: contracts.filter((c) => c.call_status === "callback").length,

    // WhatsApp status breakdown
    whatsappNotSent: contracts.filter((c) => c.whatsapp_status === "not_sent").length,
    whatsappSent: contracts.filter((c) => c.whatsapp_status === "sent").length,
    whatsappReplied: contracts.filter((c) => c.whatsapp_status === "replied").length,

    // Action taken breakdown
    actionNone: contracts.filter((c) => c.action_taken === "none").length,
    extended: contracts.filter((c) => c.action_taken === "extended").length,
    returning: contracts.filter((c) => c.action_taken === "returning").length,
    closed: contracts.filter((c) => c.action_taken === "closed").length,
    immobilised: contracts.filter((c) => c.action_taken === "immobilised").length,

    // Receivables
    totalOutstanding: contracts.reduce((sum, c) => sum + (c.outstanding_amount > 0 ? c.outstanding_amount : 0), 0),
    contractsWithOutstanding: contracts.filter((c) => c.outstanding_amount > 0).length,
  };
}

// ---------- Contract actions ----------

export async function updateCallStatus(
  contractId: string,
  status: ContractRow["call_status"]
) {
  // Get current value for audit log
  const { data: current } = await supabase
    .from("contracts")
    .select("call_status, agreement_no")
    .eq("id", contractId)
    .single();

  const { error } = await supabase
    .from("contracts")
    .update({ call_status: status, last_updated: new Date().toISOString() })
    .eq("id", contractId);
  if (error) throw error;

  // Log the action
  await supabase.from("action_log").insert({
    contract_id: contractId,
    agreement_no: current?.agreement_no,
    action_type: "call_status_change",
    old_value: current?.call_status,
    new_value: status,
  });
}

export async function updateWhatsappStatus(
  contractId: string,
  status: ContractRow["whatsapp_status"]
) {
  const { data: current } = await supabase
    .from("contracts")
    .select("whatsapp_status, agreement_no")
    .eq("id", contractId)
    .single();

  const { error } = await supabase
    .from("contracts")
    .update({ whatsapp_status: status, last_updated: new Date().toISOString() })
    .eq("id", contractId);
  if (error) throw error;

  await supabase.from("action_log").insert({
    contract_id: contractId,
    agreement_no: current?.agreement_no,
    action_type: "whatsapp_sent",
    old_value: current?.whatsapp_status,
    new_value: status,
  });
}

export async function updateActionTaken(
  contractId: string,
  action: ContractRow["action_taken"]
) {
  const { data: current } = await supabase
    .from("contracts")
    .select("action_taken, agreement_no")
    .eq("id", contractId)
    .single();

  const { error } = await supabase
    .from("contracts")
    .update({ action_taken: action, last_updated: new Date().toISOString() })
    .eq("id", contractId);
  if (error) throw error;

  await supabase.from("action_log").insert({
    contract_id: contractId,
    agreement_no: current?.agreement_no,
    action_type: "status_change",
    old_value: current?.action_taken,
    new_value: action,
  });
}

export async function addNote(contractId: string, note: string) {
  const { data: current } = await supabase
    .from("contracts")
    .select("notes, agreement_no")
    .eq("id", contractId)
    .single();

  const { error } = await supabase
    .from("contracts")
    .update({ notes: note, last_updated: new Date().toISOString() })
    .eq("id", contractId);
  if (error) throw error;

  await supabase.from("action_log").insert({
    contract_id: contractId,
    agreement_no: current?.agreement_no,
    action_type: "note_added",
    old_value: current?.notes,
    new_value: note,
  });
}

// ---------- Upload / Upsert ----------

export async function upsertContracts(
  rows: Partial<ContractRow>[],
  batchId: string,
  filename: string,
  category: string
) {
  let newRows = 0;
  let updatedRows = 0;

  for (const row of rows) {
    if (!row.agreement_no) continue;

    // Check if exists
    const { data: existing } = await supabase
      .from("contracts")
      .select("id, call_status, whatsapp_status, action_taken, notes")
      .eq("agreement_no", row.agreement_no)
      .single();

    if (existing) {
      // Update data fields but PRESERVE action tracking fields
      const { error } = await supabase
        .from("contracts")
        .update({
          contract_type: row.contract_type,
          vehicle_no: row.vehicle_no,
          make_model: row.make_model,
          customer_name: row.customer_name,
          contact_number: row.contact_number,
          customer_email: row.customer_email,
          sales_person: row.sales_person,
          start_date: row.start_date,
          end_date: row.end_date,
          expected_date: row.expected_date,
          branch: row.branch,
          in_branch: row.in_branch,
          collection_branch: row.collection_branch,
          daily_rate: row.daily_rate,
          total_amount: row.total_amount,
          outstanding_amount: row.outstanding_amount,
          deposit_amount: row.deposit_amount,
          category: row.category || category,
          upload_batch: batchId,
          uploaded_at: new Date().toISOString(),
          // DO NOT overwrite: call_status, whatsapp_status, action_taken, notes
        })
        .eq("id", existing.id);
      if (error) throw error;
      updatedRows++;
    } else {
      // Insert new
      const { error } = await supabase.from("contracts").insert({
        ...row,
        category: row.category || category,
        upload_batch: batchId,
        call_status: "not_called",
        whatsapp_status: "not_sent",
        action_taken: "none",
      });
      if (error) throw error;
      newRows++;
    }
  }

  // Log the upload
  await supabase.from("upload_history").insert({
    batch_id: batchId,
    filename,
    category,
    total_rows: rows.length,
    new_rows: newRows,
    updated_rows: updatedRows,
  });

  return { total: rows.length, newRows, updatedRows };
}

export async function getUploadHistory() {
  const { data, error } = await supabase
    .from("upload_history")
    .select("*")
    .order("uploaded_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return data as UploadHistoryRow[];
}

export async function getActionLog(contractId?: string) {
  let query = supabase
    .from("action_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (contractId) {
    query = query.eq("contract_id", contractId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as ActionLogRow[];
}
