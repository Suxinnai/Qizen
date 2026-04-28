import { sanitizeLlmText } from "../llm";

export function sanitizeStudyText(value: string) {
  return sanitizeLlmText(value);
}

export function splitStudyParagraphs(content: string) {
  return sanitizeStudyText(content).split("\n\n").filter(Boolean);
}
