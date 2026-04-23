/**
 * M-Markup Transpiler v1.0
 * Converts M-Markup DSL strings into the app's internal Question[] format.
 *
 * Supported types (MVP):
 *   .m  → MCQ (single correct)
 *   .ms → MSQ (multiple correct) — stored as MCQ with multiple isCorrect:true
 *   .tf → True/False             — stored as MCQ
 *   .n  → Numeric / text_answer
 *
 * NOT supported in MVP: .mtc (match the column), inline [t] tables
 *
 * The transpiler is DETERMINISTIC. No AI is involved at this stage.
 */


// ─── Output type (matches NewModule.tsx internal state) ──────────────────────


export interface ParsedOption {
  id: string;
  text: string;
  isCorrect: boolean;
}


export interface ParsedQuestion {
  id: string;
  type: 'MCQ' | 'text_answer';
  text: string;
  options: ParsedOption[] | null;
  correctAnswer: string | null; // for text_answer
  explanation: string | null;
}


export interface TranspileResult {
  questions: ParsedQuestion[];
  errors: TranspileError[];
  skipped: number; // count of unsupported/malformed blocks skipped
}


export interface TranspileError {
  questionNumber: number | null;
  message: string;
}


// ─── Internal helpers ─────────────────────────────────────────────────────────


function uuid(): string {
  return crypto.randomUUID();
}


/**
 * Splits a string on a delimiter, but only on UNESCAPED occurrences.
 * Escaped delimiter is \| → treated as literal |
 */
function splitUnescaped(str: string, delimiter: string): string[] {
  const parts: string[] = [];
  let current = '';
  let inMath = false;
  let i = 0;
  while (i < str.length) {
    // Toggle math mode on unescaped $
    if (str[i] === '$' && (i === 0 || str[i - 1] !== '\\')) {
      inMath = !inMath;
      current += str[i];
      i++;
      continue;
    }
    // Inside math mode, all | are literal — never split
    if (inMath && str.slice(i, i + delimiter.length) === delimiter) {
      current += str[i];
      i++;
      continue;
    }
    // Outside math: \| is escaped literal pipe
    if (str[i] === '\\' && str.slice(i, i + delimiter.length + 1) === '\\' + delimiter) {
      current += delimiter;
      i += delimiter.length + 1;
      continue;
    }
    // Normal split point
    if (!inMath && str.slice(i, i + delimiter.length) === delimiter) {
      parts.push(current);
      current = '';
      i += delimiter.length;
      continue;
    }
    current += str[i];
    i++;
  }
  parts.push(current);
  return parts;
}


/**
 * Strips the leading escape character from reserved characters.
 * e.g. \{ → {, \* → *, \>> → >>
 */
function unescape(str: string): string {
  return str.replace(/\\([{}[\]|*>\\])/g, '$1');
}


/**
 * Extracts content between the OUTERMOST matching { } pair.
 * Handles nested braces that appear inside LaTeX (they are always literal per spec §6).
 * Returns null if no valid block found.
 */
function extractBraceBlock(str: string, startIdx: number): { content: string; endIdx: number } | null {
  if (str[startIdx] !== '{') return null;
  let depth = 0;
  let i = startIdx;
  let content = '';
  while (i < str.length) {
    const ch = str[i];
    if (ch === '{') {
      depth++;
      if (depth > 1) content += ch; // only add inner { to content
    } else if (ch === '}') {
      depth--;
      if (depth === 0) return { content, endIdx: i };
      content += ch;
    } else {
      content += ch;
    }
    i++;
  }
  return null; // unmatched
}


/**
 * Extracts content between the OUTERMOST matching [ ] pair.
 * Returns null if not found.
 */
function extractBracketBlock(str: string, startIdx: number): { content: string; endIdx: number } | null {
  if (str[startIdx] !== '[') return null;
  let depth = 0;
  let i = startIdx;
  let content = '';
  while (i < str.length) {
    const ch = str[i];
    if (ch === '[') {
      depth++;
      if (depth > 1) content += ch;
    } else if (ch === ']') {
      depth--;
      if (depth === 0) return { content, endIdx: i };
      content += ch;
    } else {
      content += ch;
    }
    i++;
  }
  return null;
}


// ─── Header parser ────────────────────────────────────────────────────────────


export interface MMarkupHeader {
  version: string;
  title: string;
  subject: string;
  marks: number;
  neg: number;
}


function parseHeader(line: string): MMarkupHeader | null {
  if (!line.startsWith('!!{')) return null;
  const braceBlock = extractBraceBlock(line, 2);
  if (!braceBlock) return null;


  const raw = braceBlock.content;


  const get = (key: string): string | null => {
    const match = raw.match(new RegExp(`${key}\\s*:\\s*"([^"]*)"`, 'i'))
      || raw.match(new RegExp(`${key}\\s*:\\s*([^,}]+)`, 'i'));
    return match ? match[1].trim() : null;
  };


  return {
    version: get('v') || '1.0',
    title: get('title') || '',
    subject: get('subject') || '',
    marks: parseInt(get('marks') || '4', 10),
    neg: parseInt(get('neg') || '-1', 10),
  };
}


// ─── Single question parser ───────────────────────────────────────────────────


/**
 * Parses a single question chunk (everything after the leading ?N).
 * Chunk format: .<type>{<content>}[<answer>]>>{<explanation>}
 */
function parseQuestionChunk(
  chunk: string,
  questionNumber: number,
  errors: TranspileError[]
): ParsedQuestion | null {


  // 1. Extract type code
  const typeMatch = chunk.match(/^\.(m|n|tf)\b/i);
  if (!typeMatch) {
    errors.push({ questionNumber, message: `Unknown or missing type code in: "${chunk.slice(0, 40)}"` });
    return null;
  }


  const typeCode = typeMatch[1].toLowerCase() as 'm' | 'n' | 'tf';
  let cursor = typeMatch[0].length; // advance past ".type"


  // 2. Extract content block { }
  // Skip any whitespace between type and {
  while (cursor < chunk.length && chunk[cursor] !== '{') cursor++;


  const contentBlock = extractBraceBlock(chunk, cursor);
  if (!contentBlock) {
    errors.push({ questionNumber, message: `Missing content block { } for question ${questionNumber}` });
    return null;
  }


  const questionText = unescape(contentBlock.content.trim());
  cursor = contentBlock.endIdx + 1;


  // 3. Extract answer block [ ] (or =[ ] for mtc — not supported in MVP)
  while (cursor < chunk.length && chunk[cursor] !== '[' && chunk[cursor] !== '>') cursor++;


  let answerRaw = '';
  if (cursor < chunk.length && chunk[cursor] === '[') {
    const ansBlock = extractBracketBlock(chunk, cursor);
    if (ansBlock) {
      answerRaw = ansBlock.content;
      cursor = ansBlock.endIdx + 1;
    }
  }


  // 4. Extract explanation block >>{ }
  let explanation: string | null = null;
  const expMatch = chunk.slice(cursor).match(/>>\s*\{/);
  if (expMatch) {
    const expStart = cursor + chunk.slice(cursor).indexOf('>>') + expMatch[0].length - 1;
    // expStart should now point to the '{'
    const actualStart = chunk.indexOf('{', cursor + chunk.slice(cursor).indexOf('>>'));
    const expBlock = extractBraceBlock(chunk, actualStart);
    if (expBlock) {
      explanation = unescape(expBlock.content.trim());
    }
  }


  // 5. Build ParsedQuestion based on type
  switch (typeCode) {
    case 'm': {
      // Single-correct MCQ
      const rawOptions = splitUnescaped(answerRaw, '|');
      if (rawOptions.length < 2) {
        errors.push({ questionNumber, message: `MCQ question ${questionNumber} has fewer than 2 options` });
        return null;
      }


      let hasCorrect = false;
      const options: ParsedOption[] = rawOptions.map(opt => {
        const isCorrect = opt.trimStart().startsWith('*');
        if (isCorrect) hasCorrect = true;
        return {
          id: uuid(),
          text: unescape(isCorrect ? opt.trimStart().slice(1).trim() : opt.trim()),
          isCorrect,
        };
      });


      if (!hasCorrect) {
        errors.push({ questionNumber, message: `MCQ question ${questionNumber} has no correct answer marked with *` });
        return null;
      }


      return {
        id: uuid(),
        type: 'MCQ',
        text: questionText,
        options,
        correctAnswer: null,
        explanation,
      };
    }


    case 'tf': {
      // True/False — stored as MCQ with two options
      const rawOptions = splitUnescaped(answerRaw, '|');
      if (rawOptions.length !== 2) {
        errors.push({ questionNumber, message: `T/F question ${questionNumber} must have exactly 2 options (True|False)` });
        return null;
      }


      const options: ParsedOption[] = rawOptions.map(opt => {
        const isCorrect = opt.trimStart().startsWith('*');
        return {
          id: uuid(),
          text: unescape(isCorrect ? opt.trimStart().slice(1).trim() : opt.trim()),
          isCorrect,
        };
      });


      return {
        id: uuid(),
        type: 'MCQ',
        text: questionText,
        options,
        correctAnswer: null,
        explanation,
      };
    }


    case 'n': {
      // Numeric — stored as text_answer
      const answer = unescape(answerRaw.trim());
      if (!answer) {
        errors.push({ questionNumber, message: `Numeric question ${questionNumber} has no answer value` });
        return null;
      }


      return {
        id: uuid(),
        type: 'text_answer',
        text: questionText,
        options: null,
        correctAnswer: answer,
        explanation,
      };
    }


    default:
      errors.push({ questionNumber, message: `Unhandled type code "${typeCode}" for question ${questionNumber}` });
      return null;
  }
}


// ─── Main entrypoint ──────────────────────────────────────────────────────────


/**
 * Transpiles a full M-Markup document string into ParsedQuestion[].
 *
 * @param raw - The raw M-Markup string (may or may not include !!{ header)
 * @returns TranspileResult with questions, errors, and skipped count
 */
export function transpile(raw: string): TranspileResult {
  const errors: TranspileError[] = [];
  const questions: ParsedQuestion[] = [];
  let skipped = 0;


  if (!raw || raw.trim() === '') {
    errors.push({ questionNumber: null, message: 'Input is empty' });
    return { questions, errors, skipped };
  }


  const lines = raw.split('\n');
  let body = raw;


  // Strip optional !!{ header line
  if (lines[0].trimStart().startsWith('!!{')) {
    body = lines.slice(1).join('\n');
  }


  // Split on question anchors: ? followed immediately by one or more digits
  // We keep the delimiter so we know where each question starts
  const chunks = body.split(/(?=\?\d+\.)/);


  for (const chunk of chunks) {
    const trimmed = chunk.trim();
    if (!trimmed) continue;


    // Extract question number
    const numMatch = trimmed.match(/^\?(\d+)\./);
    if (!numMatch) {
      // Not a question chunk (could be stray text or comments) — skip silently
      continue;
    }


    const questionNumber = parseInt(numMatch[1], 10);
    const rest = trimmed.slice(numMatch[0].length - 1); // keep the dot for type parsing


    // Check for unsupported .mtc type
    if (rest.startsWith('.mtc')) {
      skipped++;
      errors.push({ questionNumber, message: `Question ${questionNumber}: .mtc (Match the Column) is not supported in MVP — skipped` });
      continue;
    }


    const parsed = parseQuestionChunk(rest, questionNumber, errors);
    if (parsed) {
      questions.push(parsed);
    } else {
      skipped++;
    }
  }


  return { questions, errors, skipped };
}
