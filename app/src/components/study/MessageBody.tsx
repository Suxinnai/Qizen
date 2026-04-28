import { splitStudyParagraphs } from "../../lib/study/sanitize";

export function MessageBody({ content }: { content: string }) {
  const paragraphs = splitStudyParagraphs(content);
  return (
    <div className="space-y-3">
      {paragraphs.map((paragraph, index) => (
        <p key={`${index}-${paragraph.slice(0, 8)}`} className="leading-[1.85]">
          {paragraph}
        </p>
      ))}
    </div>
  );
}
