export function textResult(text: string) {
  return { content: [{ type: 'text' as const, text }] };
}

export function invalidParamsResult(toolName: string, expectedShape: string) {
  return textResult(`Invalid params for ${toolName}. Expected ${expectedShape}.`);
}

export function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
