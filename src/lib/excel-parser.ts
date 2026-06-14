import * as XLSX from "xlsx";
import { ContractRow } from "./supabase";

/**
 * Parse Speed ERP Excel/CSV export into contract rows.
 *
 * Known column headers from Speed ERP "EXPORT TO EXCEL":
 *   No, Type, Vehicle No, Make And Model, Customer, Contact Number,
 *   Sales Person, Start Date, Expected Date, Branch, In Branch, Collection Branch
 *
 * The parser maps these exact headers — no guessing or parsing.
 * Unknown columns are ignored. Missing columns produce null values.
 */

// Exact mapping: Speed ERP header → our DB column
const HEADER_MAP: Record<string, keyof ContractRow> = {
  // Primary columns from the grid
  "no": "agreement_no",
  "agreement no": "agreement_no",
  "agreement number": "agreement_no",
  "contract no": "agreement_no",
  "type": "contract_type",
  "rate type": "contract_type",
  "vehicle no": "vehicle_no",
  "vehicle number": "vehicle_no",
  "plate no": "vehicle_no",
  "plate number": "vehicle_no",
  "make and model": "make_model",
  "make & model": "make_model",
  "vehicle model": "make_model",
  "model": "make_model",
  "customer": "customer_name",
  "customer name": "customer_name",
  "contact number": "contact_number",
  "contact no": "contact_number",
  "mobile": "contact_number",
  "phone": "contact_number",
  "mobile no": "contact_number",
  "email": "customer_email",
  "customer email": "customer_email",
  "e-mail": "customer_email",
  "sales person": "sales_person",
  "salesperson": "sales_person",
  "sales": "sales_person",
  "start date": "start_date",
  "checkout date": "start_date",
  "expected date": "expected_date",
  "expected return": "expected_date",
  "end date": "end_date",
  "return date": "end_date",
  "due date": "end_date",
  "branch": "branch",
  "in branch": "in_branch",
  "current branch": "in_branch",
  "collection branch": "collection_branch",
  "collection": "collection_branch",
  "rate": "daily_rate",
  "daily rate": "daily_rate",
  "total": "total_amount",
  "total amount": "total_amount",
  "amount": "total_amount",
  "outstanding": "outstanding_amount",
  "balance": "outstanding_amount",
  "outstanding amount": "outstanding_amount",
  "deposit": "deposit_amount",
  "deposit amount": "deposit_amount",
};

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[_\-\.]+/g, " ").replace(/\s+/g, " ");
}

function parseDate(val: unknown): string | null {
  if (!val) return null;

  // Excel serial number
  if (typeof val === "number") {
    const d = XLSX.SSF.parse_date_code(val);
    if (d) {
      return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
    }
  }

  const s = String(val).trim();
  if (!s) return null;

  // Try ISO format first
  const iso = new Date(s);
  if (!isNaN(iso.getTime())) {
    return iso.toISOString().split("T")[0];
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const parts = s.split(/[\/\-]/);
  if (parts.length === 3) {
    const [a, b, c] = parts;
    if (a.length === 4) return `${a}-${b.padStart(2, "0")}-${c.padStart(2, "0")}`;
    if (c.length === 4) return `${c}-${b.padStart(2, "0")}-${a.padStart(2, "0")}`;
  }

  return null;
}

function parseNumber(val: unknown): number {
  if (val === null || val === undefined || val === "") return 0;
  if (typeof val === "number") return val;
  const n = parseFloat(String(val).replace(/[^0-9.\-]/g, ""));
  return isNaN(n) ? 0 : n;
}

export function parseExcelFile(
  buffer: ArrayBuffer,
  category: string
): Partial<ContractRow>[] {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });

  if (rawRows.length === 0) return [];

  // Build column mapping from actual headers
  const firstRow = rawRows[0];
  const colMap: Record<string, keyof ContractRow> = {};
  for (const rawHeader of Object.keys(firstRow)) {
    const normalized = normalizeHeader(rawHeader);
    if (HEADER_MAP[normalized]) {
      colMap[rawHeader] = HEADER_MAP[normalized];
    }
  }

  // Map rows to ContractRow
  const contracts: Partial<ContractRow>[] = rawRows
    .map((row) => {
      const mapped: Record<string, unknown> = {};
      for (const [rawCol, dbCol] of Object.entries(colMap)) {
        mapped[dbCol] = row[rawCol];
      }

      const agreement_no = mapped.agreement_no ? String(mapped.agreement_no).trim() : "";
      if (!agreement_no) return null;

      const contract: Partial<ContractRow> = {
        agreement_no,
        contract_type: mapped.contract_type ? String(mapped.contract_type).trim() : null,
        vehicle_no: mapped.vehicle_no ? String(mapped.vehicle_no).trim() : null,
        make_model: mapped.make_model ? String(mapped.make_model).trim() : null,
        customer_name: mapped.customer_name ? String(mapped.customer_name).trim() : null,
        contact_number: mapped.contact_number ? String(mapped.contact_number).trim() : null,
        customer_email: mapped.customer_email ? String(mapped.customer_email).trim() : null,
        sales_person: mapped.sales_person ? String(mapped.sales_person).trim() : null,
        start_date: parseDate(mapped.start_date),
        end_date: parseDate(mapped.end_date || mapped.expected_date),
        expected_date: parseDate(mapped.expected_date),
        branch: mapped.branch ? String(mapped.branch).trim() : null,
        in_branch: mapped.in_branch ? String(mapped.in_branch).trim() : null,
        collection_branch: mapped.collection_branch ? String(mapped.collection_branch).trim() : null,
        daily_rate: parseNumber(mapped.daily_rate),
        total_amount: parseNumber(mapped.total_amount),
        outstanding_amount: parseNumber(mapped.outstanding_amount),
        deposit_amount: parseNumber(mapped.deposit_amount),
        category,
      };

      return contract;
    })
    .filter(Boolean) as Partial<ContractRow>[];

  return contracts;
}

export function parseCSVText(
  text: string,
  category: string
): Partial<ContractRow>[] {
  const workbook = XLSX.read(text, { type: "string" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });

  // Reuse same logic
  if (rawRows.length === 0) return [];

  const firstRow = rawRows[0];
  const colMap: Record<string, keyof ContractRow> = {};
  for (const rawHeader of Object.keys(firstRow)) {
    const normalized = normalizeHeader(rawHeader);
    if (HEADER_MAP[normalized]) {
      colMap[rawHeader] = HEADER_MAP[normalized];
    }
  }

  return rawRows
    .map((row) => {
      const mapped: Record<string, unknown> = {};
      for (const [rawCol, dbCol] of Object.entries(colMap)) {
        mapped[dbCol] = row[rawCol];
      }

      const agreement_no = mapped.agreement_no ? String(mapped.agreement_no).trim() : "";
      if (!agreement_no) return null;

      return {
        agreement_no,
        contract_type: mapped.contract_type ? String(mapped.contract_type).trim() : null,
        vehicle_no: mapped.vehicle_no ? String(mapped.vehicle_no).trim() : null,
        make_model: mapped.make_model ? String(mapped.make_model).trim() : null,
        customer_name: mapped.customer_name ? String(mapped.customer_name).trim() : null,
        contact_number: mapped.contact_number ? String(mapped.contact_number).trim() : null,
        customer_email: mapped.customer_email ? String(mapped.customer_email).trim() : null,
        sales_person: mapped.sales_person ? String(mapped.sales_person).trim() : null,
        start_date: parseDate(mapped.start_date),
        end_date: parseDate(mapped.end_date || mapped.expected_date),
        expected_date: parseDate(mapped.expected_date),
        branch: mapped.branch ? String(mapped.branch).trim() : null,
        in_branch: mapped.in_branch ? String(mapped.in_branch).trim() : null,
        collection_branch: mapped.collection_branch ? String(mapped.collection_branch).trim() : null,
        daily_rate: parseNumber(mapped.daily_rate),
        total_amount: parseNumber(mapped.total_amount),
        outstanding_amount: parseNumber(mapped.outstanding_amount),
        deposit_amount: parseNumber(mapped.deposit_amount),
        category,
      } as Partial<ContractRow>;
    })
    .filter(Boolean) as Partial<ContractRow>[];
}
