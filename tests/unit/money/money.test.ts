import { describe, it, expect } from "vitest";
import * as money from "@/lib/money";

describe("Money utilities", () => {
  describe("toKopecks", () => {
    it("should convert rubles to kopecks", () => {
      expect(money.toKopecks(1250.50)).toBe(125050);
      expect(money.toKopecks(100)).toBe(10000);
      expect(money.toKopecks(0.01)).toBe(1);
    });

    it("should handle rounding correctly", () => {
      // IEEE 754 floating point edge cases
      expect(money.toKopecks(0.1 + 0.2)).toBe(30); // 0.30000000000000004
    });
  });

  describe("toRubles", () => {
    it("should convert kopecks to rubles", () => {
      expect(money.toRubles(125050)).toBe(1250.50);
      expect(money.toRubles(10000)).toBe(100);
      expect(money.toRubles(1)).toBe(0.01);
    });
  });

  describe("add", () => {
    it("should add two amounts", () => {
      expect(money.add(100, 200)).toBe(300);
      expect(money.add(125050, 50000)).toBe(175050);
    });
  });

  describe("subtract", () => {
    it("should subtract amounts", () => {
      expect(money.subtract(300, 100)).toBe(200);
      expect(money.subtract(125050, 50000)).toBe(75050);
    });

    it("should allow negative results", () => {
      expect(money.subtract(100, 200)).toBe(-100);
    });
  });

  describe("multiply", () => {
    it("should multiply by factor", () => {
      expect(money.multiply(100, 2)).toBe(200);
      expect(money.multiply(100, 1.5)).toBe(150);
    });

    it("should round to nearest kopeck", () => {
      expect(money.multiply(100, 1.234)).toBe(123);
      expect(money.multiply(100, 1.235)).toBe(124);
    });
  });

  describe("divideEqually", () => {
    it("should divide equally with remainder", () => {
      const result = money.divideEqually(100, 3);
      expect(result.perPart).toBe(33);
      expect(result.remainder).toBe(1);
      expect(result.perPart * 3 + result.remainder).toBe(100);
    });

    it("should handle exact division", () => {
      const result = money.divideEqually(100, 4);
      expect(result.perPart).toBe(25);
      expect(result.remainder).toBe(0);
    });

    it("should throw on invalid parts", () => {
      expect(() => money.divideEqually(100, 0)).toThrow();
      expect(() => money.divideEqually(100, -1)).toThrow();
    });
  });

  describe("compare", () => {
    it("should compare amounts", () => {
      expect(money.compare(100, 200)).toBe(-1);
      expect(money.compare(200, 100)).toBe(1);
      expect(money.compare(100, 100)).toBe(0);
    });
  });

  describe("predicates", () => {
    it("should check if positive", () => {
      expect(money.isPositive(100)).toBe(true);
      expect(money.isPositive(0)).toBe(false);
      expect(money.isPositive(-100)).toBe(false);
    });

    it("should check if zero", () => {
      expect(money.isZero(0)).toBe(true);
      expect(money.isZero(100)).toBe(false);
      expect(money.isZero(-100)).toBe(false);
    });

    it("should check if negative", () => {
      expect(money.isNegative(-100)).toBe(true);
      expect(money.isNegative(0)).toBe(false);
      expect(money.isNegative(100)).toBe(false);
    });
  });

  describe("abs", () => {
    it("should return absolute value", () => {
      expect(money.abs(100)).toBe(100);
      expect(money.abs(-100)).toBe(100);
      expect(money.abs(0)).toBe(0);
    });
  });

  describe("format", () => {
    it("should format for display", () => {
      expect(money.format(125050)).toBe("1 250,50 ₽");
      expect(money.format(10000)).toBe("100,00 ₽");
      expect(money.format(1)).toBe("0,01 ₽");
      expect(money.format(1000000)).toBe("10 000,00 ₽");
    });

    it("should handle zero", () => {
      expect(money.format(0)).toBe("0,00 ₽");
    });

    it("should handle negative amounts", () => {
      expect(money.format(-125050)).toBe("-1 250,50 ₽");
    });
  });

  describe("validate", () => {
    it("should accept valid integers", () => {
      expect(money.validate(100)).toBe(100);
      expect(money.validate(0)).toBe(0);
      expect(money.validate(-100)).toBe(-100);
    });

    it("should reject non-numbers", () => {
      expect(() => money.validate("100")).toThrow("Money must be a number");
      expect(() => money.validate(null)).toThrow("Money must be a number");
      expect(() => money.validate(undefined)).toThrow("Money must be a number");
    });

    it("should reject floating point", () => {
      expect(() => money.validate(100.5)).toThrow("Money must be an integer");
    });

    it("should reject infinity", () => {
      expect(() => money.validate(Infinity)).toThrow("Money must be finite");
      expect(() => money.validate(-Infinity)).toThrow("Money must be finite");
    });

    it("should reject NaN", () => {
      expect(() => money.validate(NaN)).toThrow("Money must be finite");
    });
  });

  describe("integer invariants (RULE-M1)", () => {
    it("should never produce floating point kopecks", () => {
      const amounts = [100, 200, 333, 1, 999999];

      for (const a of amounts) {
        for (const b of amounts) {
          const sum = money.add(a, b);
          const diff = money.subtract(a, b);

          expect(Number.isInteger(sum)).toBe(true);
          expect(Number.isInteger(diff)).toBe(true);
        }
      }
    });

    it("should handle rounding explicitly (RULE-M2)", () => {
      // Division with remainder is explicit
      const { perPart, remainder } = money.divideEqually(100, 3);

      expect(Number.isInteger(perPart)).toBe(true);
      expect(Number.isInteger(remainder)).toBe(true);
      expect(perPart * 3 + remainder).toBe(100); // No money lost
    });
  });
});
