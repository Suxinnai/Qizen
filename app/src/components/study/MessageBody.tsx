import { Fragment, useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { LibraryRagResult } from "../../lib/rag";
import { getStrongRag, scoreLabel, shouldDisplayRagEvidence } from "../../lib/study/rag-policy";

function MessageCitations({ rag }: { rag: LibraryRagResult }) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const displayRag = getStrongRag(rag);
  if (!shouldDisplayRagEvidence(displayRag)) return null;

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div className="mt-4 space-y-2">
      <div className="text-[11px] text-qz-text-muted mb-1.5">引用资料</div>
      {displayRag.results.map((match) => {
        const expanded = expandedIds.has(match.resource.id);
        const snippetSummary = match.matchedSnippet
          ? match.matchedSnippet.length <= 80
            ? match.matchedSnippet
            : match.matchedSnippet.slice(0, 77) + "..."
          : match.matchedSummary;

        return (
          <div
            key={match.resource.id}
            className="rounded-[12px] border border-qz-primary/10 bg-qz-primary/4 px-3 py-2.5"
          >
            <button
              type="button"
              onClick={() => toggleExpand(match.resource.id)}
              className="w-full flex items-start gap-2 text-left"
            >
              <span className="mt-0.5 shrink-0 text-qz-text-muted">
                {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] text-qz-text-strong dark:text-qz-text-dark truncate">
                    {match.resource.title}
                  </span>
                  <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded-full bg-qz-primary/10 text-qz-primary">
                    {scoreLabel(match.score)}
                  </span>
                </div>
                <div className="text-[11px] text-qz-text-muted mt-0.5 leading-5">
                  {snippetSummary}
                </div>
              </div>
            </button>

            {expanded ? (
              <div className="mt-2.5 pt-2.5 border-t border-qz-primary/8 space-y-2 text-[11px] text-qz-text-muted leading-5">
                {match.matchedSnippet ? (
                  <div>
                    <span className="text-qz-text-strong dark:text-qz-text-dark">命中片段：</span>
                    {match.matchedSnippet}
                  </div>
                ) : null}
                {match.matchedHighlights.length > 0 ? (
                  <div>
                    <span className="text-qz-text-strong dark:text-qz-text-dark">命中重点：</span>
                    {match.matchedHighlights.join("；")}
                  </div>
                ) : null}
                <div>
                  <span className="text-qz-text-strong dark:text-qz-text-dark">命中原因：</span>
                  {match.reasonDetails.length > 0 ? match.reasonDetails.join("；") : match.reasons.join(" · ") || "关键词命中"}
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function renderInline(text: string) {
  const parts: ReactNode[] = [];
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    const token = match[0];
    if (token.startsWith("`")) {
      parts.push(<code key={`${match.index}-code`}>{token.slice(1, -1)}</code>);
    } else if (token.startsWith("**")) {
      parts.push(<strong key={`${match.index}-strong`}>{token.slice(2, -2)}</strong>);
    } else {
      const link = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      parts.push(
        <a key={`${match.index}-link`} href={link?.[2] ?? "#"} target="_blank" rel="noreferrer">
          {link?.[1] ?? token}
        </a>
      );
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts.map((part, index) => <Fragment key={index}>{part}</Fragment>);
}

function renderMarkdownBlocks(content: string) {
  const lines = content.replace(/\r/g, "").split("\n");
  const blocks: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (line.startsWith("```")) {
      const lang = line.replace(/^```/, "").trim();
      const codeLines: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].startsWith("```")) {
        codeLines.push(lines[index]);
        index += 1;
      }
      index += 1;
      blocks.push(
        <pre key={`code-${index}`}>
          {lang ? <span className="qz-md-code-lang">{lang}</span> : null}
          <code>{codeLines.join("\n")}</code>
        </pre>
      );
      continue;
    }

    const heading = line.match(/^(#{2,4})\s+(.+)$/);
    if (heading) {
      const Tag = (`h${heading[1].length}` as "h2" | "h3" | "h4");
      blocks.push(<Tag key={`heading-${index}`}>{renderInline(heading[2])}</Tag>);
      index += 1;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quoteLines: string[] = [];
      while (index < lines.length && /^>\s?/.test(lines[index])) {
        quoteLines.push(lines[index].replace(/^>\s?/, ""));
        index += 1;
      }
      blocks.push(
        <blockquote key={`quote-${index}`}>
          {quoteLines.map((quote, quoteIndex) => (
            <p key={quoteIndex}>{renderInline(quote)}</p>
          ))}
        </blockquote>
      );
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\s*[-*]\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\s*[-*]\s+/, ""));
        index += 1;
      }
      blocks.push(
        <ul key={`ul-${index}`}>
          {items.map((item, itemIndex) => (
            <li key={itemIndex}>{renderInline(item)}</li>
          ))}
        </ul>
      );
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\s*\d+\.\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\s*\d+\.\s+/, ""));
        index += 1;
      }
      blocks.push(
        <ol key={`ol-${index}`}>
          {items.map((item, itemIndex) => (
            <li key={itemIndex}>{renderInline(item)}</li>
          ))}
        </ol>
      );
      continue;
    }

    const paragraphLines = [line.trim()];
    index += 1;
    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^(#{2,4})\s+/.test(lines[index]) &&
      !/^>\s?/.test(lines[index]) &&
      !/^\s*[-*]\s+/.test(lines[index]) &&
      !/^\s*\d+\.\s+/.test(lines[index]) &&
      !lines[index].startsWith("```")
    ) {
      paragraphLines.push(lines[index].trim());
      index += 1;
    }
    blocks.push(<p key={`p-${index}`}>{renderInline(paragraphLines.join(" "))}</p>);
  }

  return blocks;
}

export function MessageBody({ content, rag }: { content: string; rag?: LibraryRagResult }) {
  return (
    <div className="qz-md">
      {renderMarkdownBlocks(content)}
      {rag ? <MessageCitations rag={rag} /> : null}
    </div>
  );
}
