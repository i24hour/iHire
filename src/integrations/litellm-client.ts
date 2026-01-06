// ============================================
// LiteLLM Client - Universal LLM Integration
// ============================================

import OpenAI from 'openai';
import { config } from 'dotenv';

config();

export type LLMProvider = 'openai' | 'gemini' | 'claude' | 'ollama';

interface LLMConfig {
    provider: LLMProvider;
    model: string;
    apiKey?: string;
    baseUrl?: string;
}

interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

interface LLMResponse {
    content: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}

export class LiteLLMClient {
    private client: OpenAI;
    private model: string;
    private provider: LLMProvider;

    constructor(customConfig?: Partial<LLMConfig>) {
        const provider = (customConfig?.provider || process.env.LITELLM_PROVIDER || 'openai') as LLMProvider;
        const model = customConfig?.model || process.env.LITELLM_MODEL || 'gpt-4o';
        const apiKey = customConfig?.apiKey || process.env.LITELLM_API_KEY;

        this.provider = provider;
        this.model = this.resolveModel(provider, model);

        // Configure client based on provider
        const clientConfig = this.getClientConfig(provider, apiKey, customConfig?.baseUrl);
        this.client = new OpenAI(clientConfig);
    }

    private resolveModel(provider: LLMProvider, model: string): string {
        // Map to provider-specific model names if using LiteLLM-style format
        const modelMappings: Record<LLMProvider, Record<string, string>> = {
            openai: {
                'gpt-4o': 'gpt-4o',
                'gpt-4': 'gpt-4-turbo',
                'gpt-3.5': 'gpt-3.5-turbo',
            },
            gemini: {
                'gemini-pro': 'gemini-pro',
                'gemini-1.5-pro': 'gemini-1.5-pro',
                'gemini-1.5-flash': 'gemini-1.5-flash',
            },
            claude: {
                'claude-3-opus': 'claude-3-opus-20240229',
                'claude-3-sonnet': 'claude-3-sonnet-20240229',
                'claude-3-haiku': 'claude-3-haiku-20240307',
            },
            ollama: {
                'llama3': 'llama3.2',
                'mistral': 'mistral',
                'codellama': 'codellama',
            },
        };

        return modelMappings[provider]?.[model] || model;
    }

    private getClientConfig(provider: LLMProvider, apiKey?: string, customBaseUrl?: string): { apiKey: string; baseURL?: string } {
        switch (provider) {
            case 'openai':
                return {
                    apiKey: apiKey || '',
                };

            case 'gemini':
                return {
                    apiKey: apiKey || '',
                    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
                };

            case 'claude':
                return {
                    apiKey: apiKey || '',
                    baseURL: 'https://api.anthropic.com/v1/',
                };

            case 'ollama':
                return {
                    apiKey: 'ollama', // Ollama doesn't need a key
                    baseURL: customBaseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1',
                };

            default:
                return { apiKey: apiKey || '' };
        }
    }

    async chat(messages: ChatMessage[], options?: {
        temperature?: number;
        maxTokens?: number;
        jsonMode?: boolean;
    }): Promise<LLMResponse> {
        // FAIL FAST: Only 2 retries to save API limits
        const maxRetries = 2;
        let lastError: Error | null = null;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                const response = await this.client.chat.completions.create({
                    model: this.model,
                    messages: messages,
                    temperature: options?.temperature ?? 0,
                    max_tokens: options?.maxTokens ?? 4096,
                    response_format: options?.jsonMode ? { type: 'json_object' } : undefined,
                });

                const choice = response.choices[0];

                // Log token usage for monitoring
                if (response.usage) {
                    console.log(`📊 Tokens used: ${response.usage.prompt_tokens} prompt + ${response.usage.completion_tokens} completion = ${response.usage.total_tokens} total`);
                }

                return {
                    content: choice?.message?.content || '',
                    usage: response.usage ? {
                        promptTokens: response.usage.prompt_tokens,
                        completionTokens: response.usage.completion_tokens,
                        totalTokens: response.usage.total_tokens,
                    } : undefined,
                };
            } catch (error: any) {
                lastError = error;

                // Check if it's a rate limit error (429)
                if (error?.status === 429 || error?.message?.includes('429')) {
                    if (attempt < maxRetries - 1) {
                        // Short wait: only 5-10 seconds before retry
                        const waitTime = 5000 + Math.random() * 5000;
                        console.log(`⚠️ Rate limited. Quick retry in ${(waitTime / 1000).toFixed(0)}s (attempt ${attempt + 1}/${maxRetries})...`);
                        await new Promise(resolve => setTimeout(resolve, waitTime));
                        continue;
                    } else {
                        // After 2 attempts, fail immediately to save limits
                        console.error(`❌ Rate limited ${maxRetries} times. STOPPING to save API limits. Try again later.`);
                        throw new Error('Rate limit exceeded - stopping to save API quota. Please wait a few minutes and try again.');
                    }
                }

                console.error(`LLM Error (${this.provider}/${this.model}):`, error);
                throw error;
            }
        }

        console.error(`LLM Error after ${maxRetries} retries (${this.provider}/${this.model}):`, lastError);
        throw lastError;
    }

    async complete(prompt: string, options?: {
        systemPrompt?: string;
        temperature?: number;
        maxTokens?: number;
        jsonMode?: boolean;
    }): Promise<string> {
        const messages: ChatMessage[] = [];

        if (options?.systemPrompt) {
            messages.push({ role: 'system', content: options.systemPrompt });
        }

        messages.push({ role: 'user', content: prompt });

        const response = await this.chat(messages, options);
        return response.content;
    }

    async json<T>(prompt: string, options?: {
        systemPrompt?: string;
        temperature?: number;
        maxTokens?: number;
    }): Promise<T> {
        const response = await this.complete(prompt, {
            ...options,
            jsonMode: true,
        });

        try {
            return JSON.parse(response) as T;
        } catch {
            // Try to extract JSON from markdown code blocks
            const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[1].trim()) as T;
            }
            throw new Error(`Failed to parse LLM response as JSON: ${response.substring(0, 200)}`);
        }
    }

    getProviderInfo(): { provider: LLMProvider; model: string } {
        return { provider: this.provider, model: this.model };
    }
}

// Singleton instance
let defaultClient: LiteLLMClient | null = null;

export function getLLMClient(): LiteLLMClient {
    if (!defaultClient) {
        defaultClient = new LiteLLMClient();
    }
    return defaultClient;
}

export function createLLMClient(config: Partial<LLMConfig>): LiteLLMClient {
    return new LiteLLMClient(config);
}
