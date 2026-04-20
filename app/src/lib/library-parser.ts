import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import mammoth from "mammoth";
import type { ParsedLibraryItemInput, ResourceType } from "./storage";

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

function detectResourceType(fileName: string, mimeType: string): ResourceType {
  const lowerFileName = fileName.toLowerCase();
  if (lowerFileName.endsWith(".pdf") || mimeType.includes("pdf")) return "PDF";
  if (lowerFileName.endsWith(".doc") || lowerFileName.endsWith(".docx")) return "DOCX";
  if (lowerFileName.endsWith(".md") || lowerFileName.endsWith(".txt")) return "MARKDOWN";
  if (mimeType.startsWith("image/") || /\.(png|jpg|jpeg|webp)$/i.test(lowerFileName)) return "IMAGE";
  return "NOTE";
}

function stripExtension(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "");
}

function inferTags(fileName: string, text: string): string[] {
  const source = `${fileName}\n${text}`.toLowerCase();
  const tags: string[] = [];
  if (source.includes("中值") || source.includes("导数") || source.includes("微分")) tags.push("微积分");
  if (source.includes("罗尔") || source.includes("柯西")) tags.push("定理");
  if (source.includes("例题") || source.includes("练习") || source.includes("习题")) tags.push("练习");
  if (source.includes("笔记") || source.includes("总结")) tags.push("笔记");
  if (tags.length === 0) tags.push("待整理");
  return Array.from(new Set(tags));
}

function inferCourse(fileName: string, text: string) {
  const source = `${fileName}\n${text}`;
  if (/高数|微积分|中值定理|导数/.test(source)) return "高数上";
  if (/线代|矩阵|向量/.test(source)) return "线性代数";
  if (/英语|阅读|词汇/.test(source)) return "英语";
  return "待归类";
}

function inferLinkedNodeIds(text: string) {
  const source = text.toLowerCase();
  const nodeIds: string[] = [];
  if (/极限/.test(source)) nodeIds.push("node-limits");
  if (/连续/.test(source)) nodeIds.push("node-continuity");
  if (/导数|瞬时变化率/.test(source)) nodeIds.push("node-derivative");
  if (/罗尔/.test(source)) nodeIds.push("node-rolle");
  if (/中值定理|平均变化率/.test(source)) nodeIds.push("node-mvt");
  if (/柯西/.test(source)) nodeIds.push("node-cauchy");
  if (/单调|估值|应用题|证明题/.test(source)) nodeIds.push("node-applications");
  return Array.from(new Set(nodeIds));
}

function normalizeText(text: string) {
  return text.replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").replace(/[ \t]{2,}/g, " ").trim();
}

function splitParagraphs(text: string) {
  return normalizeText(text)
    .split(/\n\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function makePreview(text: string) {
  const plain = normalizeText(text).replace(/\n/g, " ");
  return plain.length <= 120 ? plain : `${plain.slice(0, 120)}…`;
}

function makeSummary(text: string, fileName: string, type: ResourceType, parserStatus: ParsedLibraryItemInput["parserStatus"]) {
  const paragraphs = splitParagraphs(text);
  if (parserStatus === "unsupported") {
    return `当前版本暂不支持直接解析 ${type} 正文，但已经完成资料收纳，后续可以继续补深度解析。`;
  }
  if (paragraphs.length === 0) {
    return `这份《${stripExtension(fileName)}》已导入，但正文内容较少，建议结合资料原文继续查看。`;
  }
  const first = paragraphs[0].replace(/^#+\s*/, "");
  return first.length <= 90
    ? `这份资料主要围绕：${first}`
    : `这份资料主要围绕：${first.slice(0, 90)}…`;
}

function extractHighlights(text: string) {
  const paragraphs = splitParagraphs(text);
  const bullets = paragraphs
    .flatMap((paragraph) => paragraph.split("\n"))
    .map((line) => line.trim().replace(/^[-*>#]+\s*/, ""))
    .filter((line) => line.length >= 4 && line.length <= 42);

  const byPriority = bullets.filter((line) => /条件|结论|关键词|定义|意义|步骤|注意|例题/.test(line));
  const pool = byPriority.length ? byPriority : bullets;
  const unique = Array.from(new Set(pool));
  return unique.slice(0, 4);
}

async function parsePdf(file: File) {
  const buffer = await file.arrayBuffer();
  const pdf = await getDocument({ data: buffer }).promise;
  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const lines = textContent.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (lines) pages.push(lines);
  }

  return {
    text: normalizeText(pages.join("\n\n")),
    pageCount: pdf.numPages,
  };
}

async function parseTextLikeFile(file: File) {
  const text = await file.text();
  return normalizeText(text);
}

async function parseDocx(file: File) {
  const buffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  return normalizeText(result.value);
}

export async function parseLibraryFile(file: File): Promise<ParsedLibraryItemInput> {
  const type = detectResourceType(file.name, file.type);
  let extractedText = "";
  let parserStatus: ParsedLibraryItemInput["parserStatus"] = "unsupported";
  let pageCount: number | undefined;

  try {
    if (type === "PDF") {
      const result = await parsePdf(file);
      extractedText = result.text;
      pageCount = result.pageCount;
      parserStatus = result.text ? "parsed" : "partial";
    } else if (type === "MARKDOWN" || type === "NOTE") {
      extractedText = await parseTextLikeFile(file);
      parserStatus = extractedText ? "parsed" : "partial";
    } else if (type === "DOCX") {
      extractedText = await parseDocx(file);
      parserStatus = extractedText ? "parsed" : "partial";
    } else if (type === "IMAGE") {
      parserStatus = "unsupported";
      extractedText = "当前版本还没有接入 OCR，这份图片资料已收纳，后续可以继续补识别。";
    }
  } catch {
    parserStatus = "partial";
    extractedText = "解析过程中遇到一点问题，但资料已经被收纳，你仍然可以继续查看和生成练习。";
  }

  const preview = makePreview(extractedText);
  const highlights = extractHighlights(extractedText);
  const course = inferCourse(file.name, extractedText);

  return {
    title: stripExtension(file.name),
    originalFileName: file.name,
    type,
    sizeBytes: file.size,
    course,
    tags: inferTags(file.name, extractedText),
    parserStatus,
    extractedText,
    preview,
    summary: makeSummary(extractedText, file.name, type, parserStatus),
    highlights,
    linkedNodeIds: inferLinkedNodeIds(`${file.name}\n${extractedText}`),
    pageCount,
  };
}

export async function parseLibraryFiles(files: File[]) {
  const results: ParsedLibraryItemInput[] = [];
  for (const file of files) {
    results.push(await parseLibraryFile(file));
  }
  return results;
}
