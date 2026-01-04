// ============================================
// Base Agent - Abstract LLM-Powered Agent
// ============================================

import { LiteLLMClient, getLLMClient } from '../integrations/litellm-client.js';

export interface AgentResult<T> {
    data: T;
    explanation: string;
    confidence: number;
}

export abstract class BaseAgent<TInput, TOutput> {
    protected llm: LiteLLMClient;
    protected name: string;

    constructor(name: string, llmClient?: LiteLLMClient) {
        this.name = name;
        this.llm = llmClient || getLLMClient();
    }

    protected abstract getSystemPrompt(): string;
    protected abstract buildUserPrompt(input: TInput): string;
    protected abstract parseResponse(response: string): TOutput;

    async execute(input: TInput): Promise<AgentResult<TOutput>> {
        const startTime = Date.now();

        console.log(`[${this.name}] Starting analysis...`);

        const systemPrompt = this.getSystemPrompt();
        const userPrompt = this.buildUserPrompt(input);

        const response = await this.llm.complete(userPrompt, {
            systemPrompt,
            temperature: 0.3, // Lower temperature for more consistent analysis
            maxTokens: 4096,
            jsonMode: true,
        });

        const data = this.parseResponse(response);

        const elapsed = Date.now() - startTime;
        console.log(`[${this.name}] Completed in ${elapsed}ms`);

        return {
            data,
            explanation: this.extractExplanation(response),
            confidence: this.calculateConfidence(data),
        };
    }

    protected extractExplanation(response: string): string {
        try {
            const parsed = JSON.parse(response);
            return parsed.explanation || parsed.reasoning || '';
        } catch {
            return '';
        }
    }

    protected calculateConfidence(_data: TOutput): number {
        return 0.8; // Default confidence, override in subclasses
    }

    getName(): string {
        return this.name;
    }
}
