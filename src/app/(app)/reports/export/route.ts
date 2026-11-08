import { NextResponse, type NextRequest } from "next/server";
import { addisToday } from "@/lib/day";
import { csvCell, periodRange, PERIODS, type Period } from "@/lib/period";
import { exportPurchases } from "@/server/dal/coffee";
import { getSession } from "@/server/dal/session";

const HEADER = ["date", "farmer_no", "farmer", "kebele", "grade", "lot", "kg", "price_per_kg", "amount", "moisture_note"];

export async function GET(request: NextRequest) {
  const { profile } = await getSession();
  if (profile.role === "staff") return new NextResponse(null, { status: 403 });
  const raw = request.nextUrl.searchParams.get("period");
  const period: Period = PERIODS.find((p) => p === raw) ?? "today";
  const { from, to } = periodRange(period, addisToday());
  const rows = await exportPurchases(from, to);
  const lines = [HEADER.join(","), ...rows.map((r) => [r.day, r.farmerNo, r.farmer, r.kebele, r.grade, r.lot, r.kg, r.price, r.amount, r.moisture].map(csvCell).join(","))];
  // The byte order mark lets Excel read Ethiopic text correctly.
  return new NextResponse(`﻿${lines.join("\r\n")}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="purchases-${from}-to-${to}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
