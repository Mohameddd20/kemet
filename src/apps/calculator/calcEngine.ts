export type CalcModule = 'standard' | 'scientific' | 'programmer' | 'converter';
export type AngleUnit = 'DEG' | 'RAD';
export type NumberBase = 'DEC' | 'HEX' | 'OCT' | 'BIN';
export type ConverterCategory = 'length' | 'storage' | 'temperature';

export interface CalcHistoryItem {
  id: string;
  expression: string;
  result: string;
  module: CalcModule;
}

const PRECEDENCE: Record<string, number> = {
  '+': 1,
  '-': 1,
  '*': 2,
  '/': 2,
  '%': 2,
  '^': 3,
};

const RIGHT_ASSOC = new Set(['^']);

function tokenize(expr: string): string[] {
  const cleaned = expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/\s+/g, '');
  const tokens: string[] = [];
  let i = 0;

  while (i < cleaned.length) {
    const ch = cleaned[i];
    if ((ch >= '0' && ch <= '9') || ch === '.') {
      let num = '';
      while (i < cleaned.length && ((cleaned[i] >= '0' && cleaned[i] <= '9') || cleaned[i] === '.')) {
        num += cleaned[i];
        i++;
      }
      tokens.push(num);
      continue;
    }

    if (ch === '-' && (tokens.length === 0 || ['+', '-', '*', '/', '%', '^', '('].includes(tokens[tokens.length - 1]))) {
      let num = '-';
      i++;
      if (i < cleaned.length && ((cleaned[i] >= '0' && cleaned[i] <= '9') || cleaned[i] === '.')) {
        while (i < cleaned.length && ((cleaned[i] >= '0' && cleaned[i] <= '9') || cleaned[i] === '.')) {
          num += cleaned[i];
          i++;
        }
        tokens.push(num);
        continue;
      } else {
        tokens.push('-1');
        tokens.push('*');
        continue;
      }
    }

    if ('+-*/%^()'.includes(ch)) {
      tokens.push(ch);
      i++;
      continue;
    }

    throw new Error(`Unexpected token: ${ch}`);
  }

  return tokens;
}

export function evaluateExpression(expr: string): number {
  const tokens = tokenize(expr);
  if (tokens.length === 0) return 0;

  const output: (number | string)[] = [];
  const ops: string[] = [];

  for (const token of tokens) {
    if (!Number.isNaN(Number(token))) {
      output.push(Number(token));
    } else if (token === '(') {
      ops.push(token);
    } else if (token === ')') {
      while (ops.length > 0 && ops[ops.length - 1] !== '(') {
        output.push(ops.pop()!);
      }
      if (ops.pop() !== '(') throw new Error('Mismatched parentheses');
    } else if (token in PRECEDENCE) {
      while (ops.length > 0) {
        const top = ops[ops.length - 1];
        if (top === '(') break;
        const pTop = PRECEDENCE[top];
        const pTok = PRECEDENCE[token];
        if (pTop > pTok || (pTop === pTok && !RIGHT_ASSOC.has(token))) {
          output.push(ops.pop()!);
        } else {
          break;
        }
      }
      ops.push(token);
    }
  }

  while (ops.length > 0) {
    const op = ops.pop()!;
    if (op === '(' || op === ')') throw new Error('Mismatched parentheses');
    output.push(op);
  }

  const stack: number[] = [];
  for (const item of output) {
    if (typeof item === 'number') {
      stack.push(item);
    } else {
      const b = stack.pop();
      const a = stack.pop();
      if (a === undefined || b === undefined) throw new Error('Invalid expression');
      switch (item) {
        case '+':
          stack.push(a + b);
          break;
        case '-':
          stack.push(a - b);
          break;
        case '*':
          stack.push(a * b);
          break;
        case '/':
          if (b === 0) throw new Error('Division by zero');
          stack.push(a / b);
          break;
        case '%':
          if (b === 0) throw new Error('Division by zero');
          stack.push(a % b);
          break;
        case '^':
          stack.push(Math.pow(a, b));
          break;
      }
    }
  }

  if (stack.length !== 1 || !Number.isFinite(stack[0])) {
    throw new Error('Invalid result');
  }

  return Math.round(stack[0] * 1e12) / 1e12;
}

export function formatCalcNumber(num: number): string {
  if (!Number.isFinite(num)) return 'Error';
  if (Math.abs(num) > 1e12 || (num !== 0 && Math.abs(num) < 1e-9)) {
    return num.toExponential(6);
  }
  const rounded = Math.round(num * 1e10) / 1e10;
  return String(rounded);
}

export function applyScientificOp(op: string, value: number, angleUnit: AngleUnit = 'DEG'): number {
  const toRad = (v: number) => (angleUnit === 'DEG' ? (v * Math.PI) / 180 : v);
  switch (op) {
    case 'sin':
      return Math.round(Math.sin(toRad(value)) * 1e12) / 1e12;
    case 'cos':
      return Math.round(Math.cos(toRad(value)) * 1e12) / 1e12;
    case 'tan': {
      const cos = Math.cos(toRad(value));
      if (Math.abs(cos) < 1e-12) throw new Error('Undefined');
      return Math.round(Math.tan(toRad(value)) * 1e12) / 1e12;
    }
    case 'sqrt':
      if (value < 0) throw new Error('Invalid input');
      return Math.sqrt(value);
    case 'sq':
      return value * value;
    case 'inv':
      if (value === 0) throw new Error('Division by zero');
      return 1 / value;
    case 'ln':
      if (value <= 0) throw new Error('Invalid input');
      return Math.log(value);
    case 'log':
      if (value <= 0) throw new Error('Invalid input');
      return Math.log10(value);
    case 'fact': {
      if (value < 0 || !Number.isInteger(value) || value > 170) throw new Error('Invalid input');
      let acc = 1;
      for (let i = 2; i <= value; i++) acc *= i;
      return acc;
    }
    case 'abs':
      return Math.abs(value);
    case 'exp':
      return Math.exp(value);
    default:
      throw new Error(`Unknown operation: ${op}`);
  }
}

export function convertBase(value: string, fromBase: NumberBase): Record<NumberBase, string> {
  const radixMap: Record<NumberBase, number> = { DEC: 10, HEX: 16, OCT: 8, BIN: 2 };
  const parsed = parseInt(value.trim() || '0', radixMap[fromBase]);
  if (Number.isNaN(parsed)) {
    return { DEC: '0', HEX: '0', OCT: '0', BIN: '0' };
  }
  const intVal = Math.trunc(parsed);
  return {
    DEC: intVal.toString(10),
    HEX: (intVal >>> 0).toString(16).toUpperCase(),
    OCT: (intVal >>> 0).toString(8),
    BIN: (intVal >>> 0).toString(2),
  };
}

export function applyBitwiseOp(
  a: number,
  b: number,
  op: 'AND' | 'OR' | 'XOR' | 'LSH' | 'RSH'
): number {
  const ia = Math.trunc(a);
  const ib = Math.trunc(b);
  switch (op) {
    case 'AND':
      return ia & ib;
    case 'OR':
      return ia | ib;
    case 'XOR':
      return ia ^ ib;
    case 'LSH':
      return ia << (ib & 31);
    case 'RSH':
      return ia >> (ib & 31);
  }
}

export const CONVERTER_UNITS: Record<ConverterCategory, { id: string; label: string; factor?: number }[]> = {
  length: [
    { id: 'm', label: 'Meters (m)', factor: 1 },
    { id: 'km', label: 'Kilometers (km)', factor: 1000 },
    { id: 'cm', label: 'Centimeters (cm)', factor: 0.01 },
    { id: 'mm', label: 'Millimeters (mm)', factor: 0.001 },
    { id: 'mi', label: 'Miles (mi)', factor: 1609.344 },
    { id: 'ft', label: 'Feet (ft)', factor: 0.3048 },
  ],
  storage: [
    { id: 'B', label: 'Bytes (B)', factor: 1 },
    { id: 'KB', label: 'Kilobytes (KB)', factor: 1024 },
    { id: 'MB', label: 'Megabytes (MB)', factor: 1024 * 1024 },
    { id: 'GB', label: 'Gigabytes (GB)', factor: 1024 * 1024 * 1024 },
    { id: 'TB', label: 'Terabytes (TB)', factor: 1024 * 1024 * 1024 * 1024 },
  ],
  temperature: [
    { id: 'C', label: 'Celsius (°C)' },
    { id: 'F', label: 'Fahrenheit (°F)' },
    { id: 'K', label: 'Kelvin (K)' },
  ],
};

export function convertUnit(
  value: number,
  category: ConverterCategory,
  fromUnit: string,
  toUnit: string
): number {
  if (!Number.isFinite(value)) return 0;
  if (fromUnit === toUnit) return value;

  if (category === 'temperature') {
    let celsius = value;
    if (fromUnit === 'F') celsius = ((value - 32) * 5) / 9;
    if (fromUnit === 'K') celsius = value - 273.15;

    if (toUnit === 'C') return Math.round(celsius * 1e6) / 1e6;
    if (toUnit === 'F') return Math.round(((celsius * 9) / 5 + 32) * 1e6) / 1e6;
    if (toUnit === 'K') return Math.round((celsius + 273.15) * 1e6) / 1e6;
    return value;
  }

  const units = CONVERTER_UNITS[category];
  const fromDef = units.find((u) => u.id === fromUnit);
  const toDef = units.find((u) => u.id === toUnit);
  if (!fromDef?.factor || !toDef?.factor) return value;

  const base = value * fromDef.factor;
  return Math.round((base / toDef.factor) * 1e9) / 1e9;
}
