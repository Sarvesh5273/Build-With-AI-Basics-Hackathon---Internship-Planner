import { z } from 'zod';
import { FactSchema } from '../shared/schemas';

// Groq's strict json_schema mode on gpt-oss rejects the WHOLE response with HTTP 400
// `json_validate_failed` when one value breaks a validation keyword: observed live for
// an off-list enum, a minLength and a maxLength (2026-10-24), despite the docs
// describing constrained decoding. One long or short quote therefore discarded every
// valid fact on a page.
//
// Contract: Groq receives only the structure (types, required keys, no extra keys);
// every value constraint is moved into the field description. The strict local Zod
// schema stays authoritative, and `salvage` removes only the smallest invalid unit
// (one fact, one lead index, one opportunity) instead of failing the page.
const VALUE_KEYWORDS: Record<string, (v: unknown) => string> = {
  minLength: v => `At least ${v} characters.`,
  maxLength: v => `At most ${v} characters.`,
  minItems: v => `At least ${v} items.`,
  maxItems: v => `At most ${v} items.`,
  minimum: v => `Minimum ${v}.`,
  maximum: v => `Maximum ${v}.`,
  exclusiveMinimum: v => `Greater than ${v}.`,
  exclusiveMaximum: v => `Less than ${v}.`,
  pattern: v => `Must match ${v}.`,
  format: v => `Format: ${v}.`,
  enum: v => `Exactly one of: ${(v as unknown[]).map(x => JSON.stringify(x)).join(', ')}.`,
  const: v => `Exactly ${JSON.stringify(v)}.`,
};

/** Returns a copy of a JSON Schema with value constraints described in text instead of enforced. */
export function relaxForWire(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(relaxForWire);
  if (!schema || typeof schema !== 'object') return schema;
  const out: Record<string, unknown> = {};
  const notes: string[] = [];
  for (const [key, value] of Object.entries(schema as Record<string, unknown>)) {
    if (key in VALUE_KEYWORDS) { notes.push(VALUE_KEYWORDS[key](value)); continue; }
    // Property names are data, not keywords: only relax their schemas.
    if (key === 'properties' && value && typeof value === 'object') {
      out[key] = Object.fromEntries(Object.entries(value).map(([k, v]) => [k, relaxForWire(v)]));
      continue;
    }
    out[key] = relaxForWire(value);
  }
  // Zod emits {const:null} or {enum:[null]} for nullable/literal null; keep that as a type.
  if (notes.length && !('type' in out) && 'enum' in (schema as object)) {
    const values = (schema as { enum: unknown[] }).enum;
    const types = [...new Set(values.map(v => v === null ? 'null' : typeof v))];
    out.type = types.length === 1 ? types[0] : types;
  }
  if (notes.length) out.description = [out.description, ...notes].filter(Boolean).join(' ');
  return out;
}

export interface FactNormalization { dropped: number; droppedOpportunities?: number; droppedLeads?: number }
const FACT_KINDS = FactSchema.shape.kind.options as readonly string[];
const DUE_KINDS = ['fixed', 'dateOnly', 'rolling', 'unknown'] as const;
const QUOTE_MIN = 8;
const long = (v: unknown, min: number) => typeof v === 'string' && v.trim().length >= min;

function normalizeFacts(facts: unknown, stats: FactNormalization): unknown {
  if (!Array.isArray(facts)) return facts;
  return facts.flatMap(fact => {
    if (!fact || typeof fact !== 'object') return [fact];
    const f = fact as Record<string, unknown>;
    if (typeof f.kind !== 'string' || !FACT_KINDS.includes(f.kind) || !long(f.quote, QUOTE_MIN)) { stats.dropped++; return []; }
    const due = f.due as Record<string, unknown> | null | undefined;
    if (due && (typeof due.kind !== 'string' || !(DUE_KINDS as readonly string[]).includes(due.kind))) return [{ ...f, due: null }];
    return [f];
  });
}

/**
 * Semantic pre-pass for `{facts}` or `{opportunities:[{facts}]}` model output:
 * an off-list category or too-short quote drops that fact; an unknown due kind
 * becomes null; an opportunity without usable identity is dropped (leads stay
 * usable); a too-short preparation identity quote becomes null ("not this
 * programme"); over-long gap notes are shortened rather than lost.
 */
export function dropUnknownFacts(value: unknown, stats: FactNormalization): unknown {
  if (!value || typeof value !== 'object') return value;
  const v = value as Record<string, unknown>;
  const out: Record<string, unknown> = { ...v };
  if ('facts' in v) out.facts = normalizeFacts(v.facts, stats);
  if ('identityQuote' in v && v.identityQuote !== null && !long(v.identityQuote, QUOTE_MIN)) out.identityQuote = null;
  if (Array.isArray(v.gaps)) out.gaps = v.gaps.map(g => typeof g === 'string' && g.length > 240 ? `${g.slice(0, 239)}…` : g);
  if (Array.isArray(v.opportunities)) out.opportunities = v.opportunities.flatMap(o => {
    if (!o || typeof o !== 'object') return [o];
    const opp = o as Record<string, unknown>;
    if (!long(opp.organization, 2) || !long(opp.title, 3) || !long(opp.identityQuote, QUOTE_MIN)) {
      stats.droppedOpportunities = (stats.droppedOpportunities ?? 0) + 1; return [];
    }
    return [{ ...opp, facts: normalizeFacts(opp.facts, stats) }];
  });
  return out;
}

type Path = PropertyKey[];
function at(root: unknown, path: Path): unknown {
  return path.reduce<unknown>((node, key) => node && typeof node === 'object' ? (node as Record<PropertyKey, unknown>)[key] : undefined, root);
}
/** Resolves the Zod schema at a data path (objects, arrays, nullable/optional/default wrappers). */
function schemaAt(schema: z.ZodType, path: Path): z.ZodType | null {
  let node: z.ZodType | null = schema;
  for (const key of path) {
    while (node instanceof z.ZodNullable || node instanceof z.ZodOptional || node instanceof z.ZodDefault) node = node.unwrap() as z.ZodType;
    if (typeof key === 'number' && node instanceof z.ZodArray) node = node.element as z.ZodType;
    else if (typeof key === 'string' && node instanceof z.ZodObject) node = (node.shape as Record<string, z.ZodType>)[key] ?? null;
    else return null;
    if (!node) return null;
  }
  return node;
}
const arrayKey = (path: Path) => String(path.findLast(k => typeof k === 'string') ?? 'items');

/**
 * Makes model output satisfy the strict schema by removing only the smallest
 * invalid array element. An over-long array is first repaired element by element
 * (Zod reports only the size, not invalid items, for an over-long array), then
 * trimmed to its maximum in original order. Fails closed — returns the value so
 * strict parsing rejects it — when an invalid value is not inside any array.
 * Every invalid removal is reported by array name; trimming extras is not.
 */
export function salvage(schema: z.ZodType, value: unknown, onDrop: (arrayKey: string) => void): unknown {
  let current: unknown;
  try { current = structuredClone(value); } catch { return value; }
  for (let round = 0; round < 40; round++) {
    const checked = schema.safeParse(current);
    if (checked.success) return current;
    const removals = new Map<string, { array: unknown[]; key: string; indices: Set<number>; depth: number }>();
    let changed = false;
    for (const issue of checked.error.issues) {
      const target = at(current, issue.path);
      if (issue.code === 'too_big' && Array.isArray(target) && typeof issue.maximum === 'number') {
        const element = schemaAt(schema, [...issue.path, 0]);
        const kept = element ? target.flatMap(item => {
          const repaired = salvage(element, item, onDrop);
          if (element.safeParse(repaired).success) return [repaired];
          onDrop(arrayKey(issue.path)); return [];
        }) : [...target];
        target.splice(0, target.length, ...kept.slice(0, Number(issue.maximum)));
        changed = true; continue;
      }
      let i = issue.path.length - 1;
      while (i >= 0 && typeof issue.path[i] !== 'number') i--;
      if (i < 0) return current; // Not inside an array: let strict validation reject it.
      const arrayPath = issue.path.slice(0, i), array = at(current, arrayPath);
      if (!Array.isArray(array)) return current;
      const id = JSON.stringify(arrayPath.map(String));
      const entry = removals.get(id) ?? { array, key: arrayKey(arrayPath), indices: new Set<number>(), depth: arrayPath.length };
      entry.indices.add(issue.path[i] as number);
      removals.set(id, entry);
    }
    if (changed) continue; // Re-validate: an over-long array hid any issues inside it.
    if (!removals.size) return current;
    // Inner arrays first, highest index first, so no pending index shifts.
    for (const { array, key, indices } of [...removals.values()].sort((a, b) => b.depth - a.depth)) {
      for (const index of [...indices].sort((a, b) => b - a)) { array.splice(index, 1); onDrop(key); }
    }
  }
  return current;
}

/** Counts salvage removals into the user-visible normalization stats. */
export function countDrop(stats: FactNormalization) {
  return (arrayKey: string) => {
    if (arrayKey === 'opportunities') stats.droppedOpportunities = (stats.droppedOpportunities ?? 0) + 1;
    else if (arrayKey === 'leadIndices') stats.droppedLeads = (stats.droppedLeads ?? 0) + 1;
    else stats.dropped++;
  };
}
