import { describe, expect, it } from "vitest";
import { calendarCells, calendarViewModel, compactMoney, dateKey, markerPriority, realizedNet } from "@/lib/presentation/calendar";

describe("calendar presentation helpers", () => {
  it("uses date-only keys without timezone drift", () => {
    expect(dateKey(2024, 2, 29)).toBe("2024-02-29");
    expect(calendarCells(2024, 2)).toHaveLength(35);
  });

  it("calculates realized net from received income and expenses", () => {
    expect(realizedNet({ receivedIncome: 12500, expenses: 3500 })).toBe(9000);
    expect(realizedNet({ receivedIncome: 0, expenses: 3500 })).toBe(-3500);
  });

  it("keeps markers prioritized and builds one lookup", () => {
    expect(markerPriority({ date: "2024-01-01", earnedIncome: 0, inTransitIncome: 0, receivedIncome: 0, expectedIncome: 100, expenses: 0, scheduledPayments: [{ name: "rent", amountKopecks: 1, status: "PENDING", protectionLevel: "HARD" }] })).toBe("risk");
    expect(calendarViewModel([{ date: "2024-01-01", earnedIncome: 0, inTransitIncome: 0, receivedIncome: 0, expectedIncome: 0, expenses: 0, scheduledPayments: [] }]).get("2024-01-01")?.date).toBe("2024-01-01");
  });

  it("keeps compact values readable", () => {
    expect(compactMoney(125000)).toBe("+1.3k");
    expect(compactMoney(-125000000)).toBe("−1.3M");
  });
});
