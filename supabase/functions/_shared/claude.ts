import Anthropic from 'npm:@anthropic-ai/sdk@1.6.0';
import { HttpError } from './http.ts';

const client = new Anthropic(); // ANTHROPIC_API_KEY はシークレットから読む

/**
 * Claude Haiku 5.5 に JSON スキーマどおりの答えを返させる（コーデ提案・検索キーワードなど軽い処理用）。
 * Haiku 5.5 にはサーバー側のフォールバックがないので、断られたら 422 でアプリに伝える。
 */
export async function askHaikuJson<T>(opts: {
  system: string;
  user: string;
  schema: Record<string, unknown>;
  refusalMessage: string;
  maxTokens?: number;
}): Promise<T> {
  const response = await client.messages.create({
    model: 'claude-haiku-5-5',
    max_tokens: opts.maxTokens ?? 8000,
    output_config: {
      effort: 'low',
      format: { type: 'json_schema', schema: opts.schema },
    },
    system: opts.system,
    messages: [{ role: 'user', content: opts.user }],
  });

  if (response.stop_reason === 'refusal') throw new HttpError(422, opts.refusalMessage);
  if (response.stop_reason === 'max_tokens') throw new Error('claude: response truncated (max_tokens)');
  const text = response.content.find((b) => b.type === 'text');
  if (!text || text.type !== 'text') throw new Error('claude: no text block');
  return JSON.parse(text.text) as T;
}
