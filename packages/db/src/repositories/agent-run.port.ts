import type { AiAgentRun, NewAiAgentRun } from "../schema/ai.schema";
import type { AgentRunStatus } from "../schema/enums";

export interface CreateAgentRunInput {
  userId: string;
  graphKey: string;
  threadId: string;
  input: unknown;
  reservationId?: string | null;
}

export interface UpdateAgentRunStatusInput {
  id: string;
  status: AgentRunStatus;
  error?: string;
  currentNodeKey?: string;
}

export interface IAgentRunRepository {
  create(input: CreateAgentRunInput): Promise<AiAgentRun>;
  getById(id: string): Promise<AiAgentRun | null>;
  listByUser(userId: string, status?: AgentRunStatus): Promise<AiAgentRun[]>;
  updateStatus(input: UpdateAgentRunStatusInput): Promise<void>;
  complete(id: string, output: unknown): Promise<void>;
}

export type { AiAgentRun, NewAiAgentRun };
