import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { authRepository } from '@/server/repositories/auth.repository';
import { chatRepository } from '@/server/repositories/chat.repository';
import { env } from '@/lib/env';

export async function POST(req: NextRequest) {
  try {
    const mockUserId = req.headers.get('x-user-id');
    const mockRole = req.headers.get('x-user-role');

    let studentId = mockUserId || 's-demo-1';
    let userRole = mockRole || 'student';

    if (!mockUserId && env.isConfigured.supabase) {
      const supabase = await createServerSupabaseClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json({ error: 'Authentication required', code: 'UNAUTHENTICATED' }, { status: 401 });
      }

      const profile = await authRepository.getCurrentUserProfile();
      if (!profile || profile.role !== 'student') {
        return NextResponse.json({ error: 'Student account required', code: 'FORBIDDEN_ROLE' }, { status: 403 });
      }

      studentId = profile.id;
      userRole = profile.role;
    }

    if (userRole !== 'student') {
      return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN_ROLE' }, { status: 403 });
    }

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // default format
    }

    const format: 'json' | 'markdown' = body.format === 'markdown' ? 'markdown' : 'json';
    const sessionId: string | undefined = typeof body.sessionId === 'string' && body.sessionId.trim() ? body.sessionId.trim() : undefined;

    const exportTimestamp = new Date().toISOString().replace(/[:.]/g, '-');

    if (sessionId) {
      const data = await chatRepository.exportSessionData(sessionId, studentId);
      if (!data) {
        return NextResponse.json(
          { error: 'Conversation session not found or owned by another user', code: 'NOT_FOUND' },
          { status: 404 }
        );
      }

      if (format === 'markdown') {
        let md = `# SentiMate Conversation Export\n\n`;
        md += `**Title:** ${data.session.title}\n`;
        md += `**Session ID:** ${data.session.id}\n`;
        md += `**Created At:** ${data.session.created_at}\n`;
        md += `**Exported At:** ${new Date().toISOString()}\n\n`;
        md += `---\n\n`;

        for (const msg of data.messages) {
          const roleLabel = msg.role === 'user' ? 'Student' : 'SentiMate Companion';
          md += `### ${roleLabel} (${msg.createdAt})\n\n`;
          md += `${msg.content}\n\n`;
        }

        return new Response(md, {
          headers: {
            'Content-Type': 'text/markdown; charset=utf-8',
            'Content-Disposition': `attachment; filename="sentimate-chat-${sessionId.slice(0, 8)}-${exportTimestamp}.md"`,
          },
        });
      }

      // JSON export
      const jsonPayload = {
        meta: {
          exportType: 'single_conversation',
          exportedAt: new Date().toISOString(),
          version: '1.0',
        },
        conversation: {
          id: data.session.id,
          title: data.session.title,
          createdAt: data.session.created_at,
          updatedAt: data.session.updated_at,
          messages: data.messages.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            createdAt: m.createdAt,
          })),
        },
      };

      return new Response(JSON.stringify(jsonPayload, null, 2), {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="sentimate-chat-${sessionId.slice(0, 8)}-${exportTimestamp}.json"`,
        },
      });
    }

    // Export all conversations
    const allData = await chatRepository.exportAllSessionsData(studentId);

    if (format === 'markdown') {
      let md = `# SentiMate Conversations Archive\n\n`;
      md += `**Student Export Date:** ${new Date().toISOString()}\n`;
      md += `**Total Conversations:** ${allData.length}\n\n`;
      md += `*Note: All messages are preserved with exact timestamps. System safety prompts and internal model tokens are excluded for clarity and privacy.*\n\n`;
      md += `================================================================================\n\n`;

      for (let i = 0; i < allData.length; i++) {
        const item = allData[i];
        md += `## Conversation ${i + 1}: ${item.session.title}\n\n`;
        md += `- **Session ID:** ${item.session.id}\n`;
        md += `- **Created At:** ${item.session.created_at}\n`;
        md += `- **Message Count:** ${item.messages.length}\n\n`;

        for (const msg of item.messages) {
          const roleLabel = msg.role === 'user' ? 'Student' : 'SentiMate Companion';
          md += `#### ${roleLabel} (${msg.createdAt})\n\n`;
          md += `${msg.content}\n\n`;
        }

        md += `\n--------------------------------------------------------------------------------\n\n`;
      }

      return new Response(md, {
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Content-Disposition': `attachment; filename="sentimate-all-conversations-${exportTimestamp}.md"`,
        },
      });
    }

    const allJsonPayload = {
      meta: {
        exportType: 'all_conversations',
        exportedAt: new Date().toISOString(),
        totalConversations: allData.length,
        version: '1.0',
      },
      conversations: allData.map((item) => ({
        id: item.session.id,
        title: item.session.title,
        createdAt: item.session.created_at,
        updatedAt: item.session.updated_at,
        messages: item.messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          createdAt: m.createdAt,
        })),
      })),
    };

    return new Response(JSON.stringify(allJsonPayload, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="sentimate-all-conversations-${exportTimestamp}.json"`,
      },
    });
  } catch (error: any) {
    console.error('[POST /api/student/export] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate conversation export', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
