import { getFinancialSnapshotForAI, type FinancialSnapshot } from "./aiTypes";
import { simulateUserScenario, type SimulationAction } from "@/lib/domain/simulation/simulationService";

export interface AITools {
  getFinancialSnapshot: (asOfDate?: string) => Promise<FinancialSnapshot>;
  simulateScenario: (cycleId: string, actions: SimulationAction[]) => ReturnType<typeof simulateUserScenario>;
}

export const createAITools = (userId: string): AITools => ({
  getFinancialSnapshot: (asOfDate) => getFinancialSnapshotForAI(userId, asOfDate),
  simulateScenario: (cycleId, actions) => simulateUserScenario(userId, cycleId, actions),
});
