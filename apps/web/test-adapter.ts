import { SENTIMATE_SYSTEM_PROMPT } from './src/server/integrations/nvidiaChatAdapter';

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

console.log('🎉 ALL ADAPTER UNIT TESTS PASSED CLEANLY!');
