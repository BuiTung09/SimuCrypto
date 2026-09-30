export type TimeIntentType =
  | 'today'
  | 'yesterday'
  | 'specific_date';

export interface TimeIntent {
  type: TimeIntentType;
  date?: Date;
}

export function detectPriceTimeIntent(message: string): TimeIntent {

  const lower = message.toLowerCase();

  // hôm nay
  if (lower.includes('hôm nay') || lower.includes('today')) {
    return { type: 'today' };
  }

  // hôm qua
  if (lower.includes('hôm qua') || lower.includes('yesterday')) {
    return { type: 'yesterday' };
  }

  // ngày dd/mm/yyyy
  const dateRegex = /(\d{1,2})\/(\d{1,2})\/(\d{4})/;
  const match = message.match(dateRegex);

  if (match) {
    const day = Number(match[1]);
    const month = Number(match[2]) - 1;
    const year = Number(match[3]);

    return {
      type: 'specific_date',
      date: new Date(year, month, day),
    };
  }

  // mặc định
  return { type: 'today' };
}