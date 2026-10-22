'use client';

import React, { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export interface MarkdownContentProps {
  content: string;
  isStreaming?: boolean;
  className?: string;
}

/**
 * Reusable Markdown renderer for assistant messages.
 * 
 * Guarantees:
 * 1. Safe HTML-neutralized rendering (no dangerouslySetInnerHTML, script/iframe sanitized).
 * 2. Full CommonMark + GFM support (paragraphs, bold, italic, headings, lists, tables, code, blockquotes).
 * 3. Theme-aware colors, readable line height, visible list markers and responsive typography.
 * 4. Horizontally scrollable code blocks and tables to prevent message/container overflow.
 * 5. Safe external link protocols with noopener noreferrer.
 * 6. Memoized for stable streaming performance.
 */
export const MarkdownContent = memo(function MarkdownContent({
  content,
  isStreaming = false,
  className = '',
}: MarkdownContentProps) {
  return (
    <div className={`sentimate-markdown text-xs sm:text-sm leading-relaxed text-[#18191B] dark:text-[#F3F4F6] min-w-0 max-w-full break-words ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Paragraphs
          p: ({ children }) => (
            <p className="mb-3 last:mb-0 leading-relaxed text-[#18191B] dark:text-[#F3F4F6]">
              {children}
            </p>
          ),

          // Headings
          h1: ({ children }) => (
            <h1 className="text-base sm:text-lg font-bold mt-4 mb-2 first:mt-0 text-[#18191B] dark:text-[#F3F4F6] tracking-tight">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-sm sm:text-base font-semibold mt-3.5 mb-2 first:mt-0 text-[#18191B] dark:text-[#F3F4F6] tracking-tight">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xs sm:text-sm font-semibold mt-3 mb-1.5 first:mt-0 text-[#18191B] dark:text-[#F3F4F6]">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-xs sm:text-sm font-medium mt-2.5 mb-1 first:mt-0 text-[#18191B] dark:text-[#F3F4F6]">
              {children}
            </h4>
          ),

          // Lists: explicit list styles, visible bullets/numbers and proper indentation
          ul: ({ children }) => (
            <ul className="list-disc list-outside pl-5 mb-3 last:mb-0 space-y-1.5 text-[#18191B] dark:text-[#F3F4F6]">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-outside pl-5 mb-3 last:mb-0 space-y-1.5 text-[#18191B] dark:text-[#F3F4F6]">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed pl-1 marker:text-[#4F648C] dark:marker:text-[#5B8DEF]">
              {children}
            </li>
          ),

          // Emphasis
          strong: ({ children }) => (
            <strong className="font-semibold text-[#18191B] dark:text-[#F3F4F6]">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="italic text-[#18191B] dark:text-[#F3F4F6]">
              {children}
            </em>
          ),

          // Blockquote
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-[#4F648C] dark:border-[#2C67C5] pl-3.5 py-1 my-3 bg-[#EEF2F8]/40 dark:bg-[#242E40]/30 rounded-r text-[#4A4D54] dark:text-[#9CA3AF] italic">
              {children}
            </blockquote>
          ),

          // Code blocks and inline code
          pre: ({ children }) => (
            <pre className="my-3 overflow-x-auto rounded-lg p-3 bg-[#F4F4F1] dark:bg-[#121316] border border-[#E2E2DC] dark:border-[#1F2024] font-mono text-[11px] sm:text-xs text-[#18191B] dark:text-[#F3F4F6] max-w-full [scrollbar-width:thin]">
              {children}
            </pre>
          ),
          code: ({ className, children, ...props }) => {
            const isBlock = Boolean(
              className?.startsWith('language-') ||
              (typeof children === 'string' && children.includes('\n'))
            );
            if (isBlock) {
              return (
                <code className={`font-mono text-[11px] sm:text-xs ${className || ''}`} {...props}>
                  {children}
                </code>
              );
            }
            return (
              <code
                className="rounded px-1.5 py-0.5 font-mono text-[11px] sm:text-xs bg-[#EAEAE5] dark:bg-[#222327] text-[#18191B] dark:text-[#F3F4F6] border border-[#E2E2DC]/80 dark:border-white/[0.08]"
                {...props}
              >
                {children}
              </code>
            );
          },

          // GFM Tables with horizontal scroll wrapper
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto max-w-full rounded-lg border border-[#E2E2DC] dark:border-[#1F2024] [scrollbar-width:thin]">
              <table className="w-full text-xs sm:text-sm text-left border-collapse min-w-[280px]">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-[#F4F4F1] dark:bg-[#18191C] text-[#18191B] dark:text-[#F3F4F6] font-semibold border-b border-[#E2E2DC] dark:border-[#1F2024]">
              {children}
            </thead>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 border-r border-[#E2E2DC]/60 dark:border-[#1F2024]/60 last:border-r-0 font-semibold text-[#18191B] dark:text-[#F3F4F6]">
              {children}
            </th>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-[#E2E2DC]/60 dark:divide-[#1F2024]/60">
              {children}
            </tbody>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 border-r border-[#E2E2DC]/60 dark:border-[#1F2024]/60 last:border-r-0 text-[#18191B] dark:text-[#F3F4F6]">
              {children}
            </td>
          ),

          // Horizontal rule
          hr: () => (
            <hr className="my-4 border-t border-[#E2E2DC] dark:border-[#1F2024]" />
          ),

          // Checkboxes for task lists
          input: ({ type, checked }) => {
            if (type === 'checkbox') {
              return (
                <input
                  type="checkbox"
                  checked={Boolean(checked)}
                  readOnly
                  aria-disabled="true"
                  className="mr-2 rounded border-[#E2E2DC] dark:border-[#2E3036] accent-[#4F648C] dark:accent-[#2C67C5] pointer-events-none"
                />
              );
            }
            return null;
          },

          // Safe link handling: restricted protocols and external security attributes
          a: ({ href, children }) => {
            const isSafe = href && /^(https?:\/\/|\/|mailto:)/i.test(href);
            if (!isSafe) {
              return <span>{children}</span>;
            }
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#4F648C] dark:text-[#5B8DEF] underline hover:text-[#405374] dark:hover:text-[#3875DC] font-medium transition-colors break-all"
              >
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>

      {/* Streaming pulse cursor */}
      {isStreaming && (
        <span
          className="inline-block w-1.5 h-4 ml-1 bg-current animate-pulse align-middle"
          aria-hidden="true"
        />
      )}
    </div>
  );
});
