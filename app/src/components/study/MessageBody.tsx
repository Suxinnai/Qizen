import type { ReactNode } from "react";
import { sanitizeStudyText } from "../../lib/study/sanitize";

type MarkdownBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; level: 2 | 3 | 4; text: string }
  | { type: "quote"; lines: string[] }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "code"; language: string; code: string };

function isBlockStart(line: string) {
  return (
    /^```/.test(line) ||
    /^#{1,4}\s+/.test(line) ||
    /^>\s?/.test(line) ||
    /^[-*+]\s+/.test(line) ||
    /^\d+[.)]\s+/.test(line)
  );
}

function parseMarkdown(value: string): MarkdownBlock[] {
  const lines = sanitizeStudyText(value).split(/\r?\n/);
  const blocks: MarkdownBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? "";
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    if (trimmed.startsWith("```")) {
      const language = trimmed.replace(/^```/, "").trim();
      const codeLines: string[] = [];
      index += 1;
      while (index < lines.length && !(lines[index] ?? "").trim().startsWith("```")) {
        codeLines.push(lines[index] ?? "");
        index += 1;
      }
      if (index < lines.length) index += 1;
      blocks.push({ type: "code", language, code: codeLines.join("\n") });
      continue;
    }

    const heading = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      const markdownLevel = heading[1].length;
      blocks.push({
        type: "heading",
        level: (markdownLevel <= 2 ? 2 : markdownLevel === 3 ? 3 : 4) as 2 | 3 | 4,
        text: heading[2].trim(),
      });
      index += 1;
      continue;
    }

    if (/^>\s?/.test(trimmed)) {
      const quoteLines: string[] = [];
      while (index < lines.length && /^>\s?/.test((lines[index] ?? "").trim())) {
        quoteLines.push((lines[index] ?? "").trim().replace(/^>\s?/, ""));
        index += 1;
      }
      blocks.push({ type: "quote", lines: quoteLines });
      continue;
    }

    if (/^[-*+]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (index < lines.length && /^[-*+]\s+/.test((lines[index] ?? "").trim())) {
        items.push((lines[index] ?? "").trim().replace(/^[-*+]\s+/, ""));
        index += 1;
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    if (/^\d+[.)]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (index < lines.length && /^\d+[.)]\s+/.test((lines[index] ?? "").trim())) {
        items.push((lines[index] ?? "").trim().replace(/^\d+[.)]\s+/, ""));
        index += 1;
      }
      blocks.push({ type: "ol", items });
      continue;
    }

    const paragraphLines: string[] = [];
    while (index < lines.length) {
      const current = lines[index] ?? "";
      if (!current.trim()) break;
      if (paragraphLines.length > 0 && isBlockStart(current.trim())) break;
      paragraphLines.push(current.trim());
      index += 1;
    }
    blocks.push({ type: "paragraph", text: paragraphLines.join(" ") });
  }

  return blocks;
}

function safeHref(href: string) {
  if (/^(https?:|mailto:)/i.test(href)) return href;
  return "#";
}

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\[[^\]]+\]\([^)]+\)|`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text))) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    const key = `${match.index}-${token}`;
    const link = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      nodes.push(
        <a key={key} href={safeHref(link[2])} target="_blank" rel="noreferrer">
          {link[1]}
        </a>
      );
    } else if (token.startsWith("`")) {
      nodes.push(<code key={key}>{token.slice(1, -1)}</code>);
    } else if (token.startsWith("**")) {
      nodes.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("*")) {
      nodes.push(<em key={key}>{token.slice(1, -1)}</em>);
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

export function MessageBody({ content }: { content: string }) {
  const blocks = parseMarkdown(content);

  return (
    <div className="qz-md">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          const Heading = `h${block.level}` as "h2" | "h3" | "h4";
          return <Heading key={`${index}-${block.text}`}>{renderInline(block.text)}</Heading>;
        }
        if (block.type === "quote") {
          return (
            <blockquote key={`${index}-${block.lines.join("")}`}>
              {block.lines.map((line, lineIndex) => (
                <p key={`${lineIndex}-${line}`}>{renderInline(line)}</p>
              ))}
            </blockquote>
          );
        }
        if (block.type === "ul") {
          return (
            <ul key={`${index}-${block.items.join("")}`}>
              {block.items.map((item, itemIndex) => (
                <li key={`${itemIndex}-${item}`}>{renderInline(item)}</li>
              ))}
            </ul>
          );
        }
        if (block.type === "ol") {
          return (
            <ol key={`${index}-${block.items.join("")}`}>
              {block.items.map((item, itemIndex) => (
                <li key={`${itemIndex}-${item}`}>{renderInline(item)}</li>
              ))}
            </ol>
          );
        }
        if (block.type === "code") {
          return (
            <pre key={`${index}-${block.language}`}>
              {block.language ? <span className="qz-md-code-lang">{block.language}</span> : null}
              <code>{block.code}</code>
            </pre>
          );
        }
        return <p key={`${index}-${block.text}`}>{renderInline(block.text)}</p>;
      })}
    </div>
  );
}
