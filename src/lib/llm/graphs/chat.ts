import { createReactAgent } from '@langchain/langgraph/prebuilt';
import {
  SystemMessage,
  HumanMessage,
  AIMessage,
  type BaseMessage,
} from '@langchain/core/messages';
import { chatModel } from '@/lib/llm/client';
import { systemMockDoctor, systemMockPatient } from '@/lib/llm/prompts';
import { chatTools } from '@/lib/llm/tools';
import { getDoctor, type Doctor } from '@/lib/data';

export interface ChatInput {
  role: 'patient' | 'doctor';
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  doctor_id: string;
  patient_name: string;
  triage?: 'green' | 'yellow' | 'red';
  symptom_text?: string;
  age?: number;
  gender?: string;
  history?: string;
  patient_demo_brief?: string;
}

function buildSystemPrompt(input: ChatInput, doctor: Doctor): string {
  if (input.role === 'patient') {
    return systemMockDoctor({
      name: doctor.name,
      specialty: doctor.specialty,
      years: doctor.years,
    });
  }
  const brief =
    input.patient_demo_brief ??
    `อาการ: ${input.symptom_text ?? 'ไม่ระบุ'} · ระดับ: ${input.triage ?? 'ไม่ระบุ'} · ประวัติ: ${input.history ?? 'ไม่มี'}`;
  return systemMockPatient(
    { name: doctor.name, specialty_th: doctor.specialty_th },
    { name: input.patient_name, age: input.age ?? 30 },
    brief,
  );
}

function buildContextMessage(input: ChatInput, doctor: Doctor): string {
  if (input.role === 'patient') {
    return [
      'Patient profile:',
      `- Name: ${input.patient_name}`,
      `- Triage tier: ${input.triage ?? 'unknown'}`,
      `- Initial symptoms: ${input.symptom_text ?? '(none provided)'}`,
    ].join('\n');
  }
  return [
    `Doctor profile: ${doctor.name} (${doctor.specialty_th})`,
    'Your patient profile:',
    `- Name: ${input.patient_name}`,
    `- Age: ${input.age ?? 30}`,
    `- Gender: ${input.gender ?? 'unspecified'}`,
    `- Main symptoms: ${input.symptom_text ?? '(none)'}`,
    `- History: ${input.history ?? 'None reported'}`,
  ].join('\n');
}

export async function* streamChat(
  input: ChatInput,
): AsyncGenerator<{ type: 'token' | 'tool_call' | 'tool_result' | 'done'; data?: unknown }> {
  const doctor = getDoctor(input.doctor_id);
  if (!doctor) {
    yield { type: 'done', data: { error: `Doctor ${input.doctor_id} not found` } };
    return;
  }

  const temperature = input.role === 'patient' ? 0.4 : 0.5;
  const llm = chatModel({ temperature });
  const agent = createReactAgent({
    llm,
    tools: chatTools,
    prompt: buildSystemPrompt(input, doctor),
  });

  const history: BaseMessage[] = input.messages.map((m) =>
    m.role === 'user' ? new HumanMessage(m.content) : new AIMessage(m.content),
  );
  const seedMessages: BaseMessage[] = [
    new SystemMessage(buildContextMessage(input, doctor)),
    ...history,
  ];

  const stream = await agent.stream(
    { messages: seedMessages },
    { streamMode: 'messages' },
  );

  for await (const event of stream) {
    if (!Array.isArray(event)) continue;
    const [chunk] = event as [BaseMessage, Record<string, unknown>];
    if (!chunk) continue;

    const type = chunk.getType ? chunk.getType() : (chunk as { _getType?: () => string })._getType?.();

    if (type === 'ai') {
      const ai = chunk as AIMessage;
      const content = typeof ai.content === 'string' ? ai.content : '';
      if (content) {
        yield { type: 'token', data: { text: content } };
      }
      const toolCalls = (ai as AIMessage & { tool_calls?: Array<{ name: string; args: unknown; id?: string }> })
        .tool_calls;
      if (toolCalls && toolCalls.length > 0) {
        for (const call of toolCalls) {
          yield { type: 'tool_call', data: { name: call.name, args: call.args, id: call.id } };
        }
      }
    } else if (type === 'tool') {
      const toolMsg = chunk as { name?: string; content?: unknown; tool_call_id?: string };
      yield {
        type: 'tool_result',
        data: {
          name: toolMsg.name,
          content: toolMsg.content,
          tool_call_id: toolMsg.tool_call_id,
        },
      };
    }
  }

  yield { type: 'done' };
}
