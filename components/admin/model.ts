import type { Content } from './sections';

export type TextAppearance = {
  font?: 'Instrument Serif' | 'DM Mono';
  size?: number;
  color?: string;
};

export type Appearance = Record<string, Record<string, TextAppearance>>;
export type SiteDocument = { content: Content; appearance: Appearance };

export const fontOptions = ['Instrument Serif', 'DM Mono'] as const;

export const typeScale = [
  { label: 'Label S', size: 11 },
  { label: 'Label M / Caption', size: 12 },
  { label: 'Body S / Label L', size: 14 },
  { label: 'Body M', size: 16 },
  { label: 'Body L / Title M', size: 18 },
  { label: 'Heading 3', size: 24 },
  { label: 'Heading 2', size: 32 },
  { label: 'Heading 1', size: 40 },
  { label: 'Display L', size: 48 },
  { label: 'Display XL', size: 64 },
  { label: 'Display 2XL', size: 80 },
] as const;

export const colorOptions = [
  { label: 'Primary', value: '#F5F7FA' },
  { label: 'Secondary', value: '#A3AFBF' },
  { label: 'Teal', value: '#00B8C4' },
  { label: 'Copper', value: '#D48B48' },
  { label: 'Critical coral', value: '#FF5860' },
  { label: 'Navy', value: '#1B2430' },
] as const;

export function cloneDocument(document: SiteDocument): SiteDocument {
  return JSON.parse(JSON.stringify(document)) as SiteDocument;
}

export function stableSerialize(value: unknown): string {
  return JSON.stringify(value, (_key, item: unknown) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return item;
    return Object.fromEntries(Object.entries(item).sort(([left], [right]) => left.localeCompare(right)));
  }) ?? '';
}

export function validateContent(value: unknown, original: Content): Content | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const incoming = value as Record<string, unknown>;
  const result: Content = {};
  let matchedSections = 0;

  for (const id of Object.keys(original)) {
    const source = incoming[id];
    if (source === undefined) {
      result[id] = { ...original[id] };
      continue;
    }
    if (!source || typeof source !== 'object' || Array.isArray(source)) return null;
    matchedSections += 1;
    const values = source as Record<string, unknown>;
    result[id] = {};
    for (const key of Object.keys(original[id])) {
      const candidate = values[key];
      if (candidate === undefined) {
        result[id][key] = original[id][key];
        continue;
      }
      if (typeof candidate !== 'string' || candidate.length > 10000) return null;
      result[id][key] = candidate;
    }
  }

  return matchedSections > 0 ? result : null;
}

export function validateAppearance(value: unknown, content: Content): Appearance | null {
  if (value === undefined || value === null) return {};
  if (typeof value !== 'object' || Array.isArray(value)) return null;
  const result: Appearance = {};
  for (const [section, fields] of Object.entries(value)) {
    if (!Object.prototype.hasOwnProperty.call(content, section) || !fields || typeof fields !== 'object' || Array.isArray(fields)) return null;
    for (const [key, raw] of Object.entries(fields)) {
      if (!Object.prototype.hasOwnProperty.call(content[section], key) || !raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
      const style = raw as Record<string, unknown>;
      if (Object.keys(style).some((property) => !['font', 'size', 'color'].includes(property))) return null;
      if (style.font !== undefined && !fontOptions.includes(style.font as typeof fontOptions[number])) return null;
      if (style.size !== undefined && (typeof style.size !== 'number' || !Number.isInteger(style.size) || style.size < 11 || style.size > 80)) return null;
      if (style.color !== undefined && (typeof style.color !== 'string' || !/^#[0-9a-f]{6}$/i.test(style.color))) return null;
      const clean: TextAppearance = {};
      if (style.font) clean.font = style.font as TextAppearance['font'];
      if (style.size) clean.size = style.size as number;
      if (style.color) clean.color = (style.color as string).toUpperCase();
      if (Object.keys(clean).length) {
        result[section] ||= {};
        result[section][key] = clean;
      }
    }
  }
  return result;
}

export function validateDocument(value: unknown, original: Content): SiteDocument | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const data = value as Record<string, unknown>;
  const content = validateContent('content' in data ? data.content : data, original);
  if (!content) return null;
  const appearance = validateAppearance('content' in data ? data.appearance : undefined, content);
  return appearance ? { content, appearance } : null;
}

export function textAppearance(appearance: Appearance, section: string, field: string, scale = 1) {
  const style = appearance[section]?.[field];
  if (!style) return undefined;
  return {
    ...(style.font ? { fontFamily: style.font === 'Instrument Serif' ? "'Instrument Serif', serif" : "'DM Mono', monospace" } : {}),
    ...(style.size ? { fontSize: `${Math.round(style.size * scale * 10) / 10}px` } : {}),
    ...(style.color ? { color: style.color } : {}),
  };
}
