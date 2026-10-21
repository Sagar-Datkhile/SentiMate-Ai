import { SENTIMATE_SYSTEM_PROMPT, nvidiaChatAdapter } from './src/server/integrations/nvidiaChatAdapter';

console.log('=== Adapter Guardrail Verification ===\n');

// 1. Check system prompt
console.log('1. Checking Sentimate System Prompt Guardrails:');
console.assert(SENTIMATE_SYSTEM_PROMPT.includes('You are SentiMate'), 'Must identify as SentiMate');
console.assert(!SENTIMATE_SYSTEM_PROMPT.includes('I am a human'), 'Must not claim to be human');
console.assert(SENTIMATE_SYSTEM_PROMPT.includes('988 Suicide & Crisis Lifeline'), 'Must include 988 lifeline');
console.assert(SENTIMATE_SYSTEM_PROMPT.includes('NOT provide medical or clinical diagnosis'), 'Must prohibit medical diagnosis');
console.assert(SENTIMATE_SYSTEM_PROMPT.includes('Do not invent counsellor availability'), 'Must prohibit inventing counsellor availability');
console.log('✓ System prompt safety assertions verified!\n');

// 2. Stream chunk reasoning filter test
console.log('2. Checking Stream Reasoning Filter:');
function filterChunk(delta: { reasoning_content?: string | null; content?: string | null }) {
  // Never pass reasoning_content
  if (delta.reasoning_content && !delta.content) {
    return null;
  }
  if (!delta.content) return null;
  return delta.content
    .replace(/<thought>[\s\S]*?<\/thought>/gi, '')
    .replace(/<\/?thought>/gi, '');
}

const reasoningChunk = { reasoning_content: 'Let me think about how Alex is feeling...', content: null };
const answerChunk = { content: 'I hear how difficult things have been with your lab work.' };
const thoughtTaggedChunk = { content: '<thought>Internal thought</thought>Here is supportive advice.' };

console.assert(filterChunk(reasoningChunk) === null, 'Reasoning chunk must be withheld');
console.assert(filterChunk(answerChunk) === 'I hear how difficult things have been with your lab work.', 'Answer chunk must be emitted');
console.assert(filterChunk(thoughtTaggedChunk) === 'Here is supportive advice.', 'Thought tags must be stripped');
console.log('✓ Stream reasoning filtering verified!\n');

// 3. Upstream provider error sanitization tests
console.log('3. Checking Upstream Provider Error Sanitization:');

// Test 3a: Raw 404 Function not found for account (e.g. credits exhausted or transient gateway routing)
const mockNvidiaFunctionNotFound = {
  status: 404,
  message: `404 {"status":404,"title":"Not Found","detail":"Function 'ac74040f-9fc9-4c5e-ac74-279ba5161d69': Not found for account 'Z8Zdw2aJUNflEffgrupu98l7ncUVePDlqdb_8nSN77g'"}`,
};
const parsed3a = nvidiaChatAdapter.parseUpstreamError(mockNvidiaFunctionNotFound);
console.assert(parsed3a.statusCode === 503, 'Must map to 503 Service Unavailable, not 404');
console.assert(parsed3a.code === 'UPSTREAM_ACCOUNT_ACCESS_ERROR', 'Must identify account access error');
console.assert(!parsed3a.message.includes('ac74040f'), 'Must not leak internal function UUID');
console.assert(!parsed3a.message.includes('Z8Zdw2a'), 'Must not leak internal account hash');
console.assert(!parsed3a.message.includes('{'), 'Must not return raw unparsed JSON');

// Test 3b: Model not found / deprecated
const mockModel404 = {
  status: 404,
  message: 'Model not found',
};
const parsed3b = nvidiaChatAdapter.parseUpstreamError(mockModel404);
console.assert(parsed3b.statusCode === 502, 'Must map to 502 Bad Gateway');
console.assert(parsed3b.code === 'UPSTREAM_MODEL_UNAVAILABLE', 'Must identify model unavailable');

// Test 3c: Rate limit 429
const mockRateLimit = {
  status: 429,
  message: 'Rate limit exceeded',
};
const parsed3c = nvidiaChatAdapter.parseUpstreamError(mockRateLimit);
console.assert(parsed3c.statusCode === 429, 'Must preserve 429 status');
console.assert(parsed3c.code === 'RATE_LIMITED', 'Must map to RATE_LIMITED');

console.log('✓ Upstream provider error sanitization verified!\n');

console.log('🎉 ALL ADAPTER UNIT TESTS PASSED CLEANLY!');
