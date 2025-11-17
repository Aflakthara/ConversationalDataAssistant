import { type AnalysisResult } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  saveAnalysis(analysis: AnalysisResult): Promise<string>;
  getAnalysis(id: string): Promise<AnalysisResult | undefined>;
}

export class MemStorage implements IStorage {
  private analyses: Map<string, AnalysisResult>;

  constructor() {
    this.analyses = new Map();
  }

  async saveAnalysis(analysis: AnalysisResult): Promise<string> {
    const id = randomUUID();
    this.analyses.set(id, analysis);
    return id;
  }

  async getAnalysis(id: string): Promise<AnalysisResult | undefined> {
    return this.analyses.get(id);
  }
}

export const storage = new MemStorage();
