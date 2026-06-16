import { NextResponse } from "next/server";
import { transitionStaleCategories } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * POST /api/transition
 *
 * Manually trigger category transitions:
 *  - "due_to_close_today" contracts whose end_date < today → "over_due_closing"
 *  - "over_due_closing" contracts whose end_date === today → "due_to_close_today"
 *
 * This runs automatically on every data fetch, but can be triggered
 * manually for immediate correction.
 */
export async function POST() {
  try {
    const result = await transitionStaleCategories();
    return NextResponse.json({
      success: true,
      ...result,
      message: `Transitioned ${result.demoted} contracts to overdue, ${result.promoted} contracts to due today`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Transition failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
