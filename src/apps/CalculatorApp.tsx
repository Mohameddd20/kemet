import { useMemo, useState } from 'react';
import { Delete, History, RotateCcw } from 'lucide-react';
import type { WindowAppProps } from '../windowManager/types';
import {
  applyBitwiseOp,
  applyScientificOp,
  CONVERTER_UNITS,
  convertBase,
  convertUnit,
  evaluateExpression,
  formatCalcNumber,
  type AngleUnit,
  type CalcHistoryItem,
  type CalcModule,
  type ConverterCategory,
  type NumberBase,
} from './calculator/calcEngine';

const MODULE_TABS: { id: CalcModule; label: string }[] = [
  { id: 'standard', label: 'Standard' },
  { id: 'scientific', label: 'Scientific' },
  { id: 'programmer', label: 'Programmer' },
  { id: 'converter', label: 'Converter' },
];

export function CalculatorApp(_props: WindowAppProps) {
  const [activeModule, setActiveModule] = useState<CalcModule>('standard');
  const [expression, setExpression] = useState('');
  const [display, setDisplay] = useState('0');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [memory, setMemory] = useState<number>(0);
  const [angleUnit, setAngleUnit] = useState<AngleUnit>('DEG');
  const [history, setHistory] = useState<CalcHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Programmer module state
  const [progBase, setProgBase] = useState<NumberBase>('DEC');
  const [progInput, setProgInput] = useState('42');
  const [bitwiseOperandA, setBitwiseOperandA] = useState<number | null>(null);
  const [pendingBitwiseOp, setPendingBitwiseOp] = useState<'AND' | 'OR' | 'XOR' | 'LSH' | 'RSH' | null>(null);

  // Converter module state
  const [convCategory, setConvCategory] = useState<ConverterCategory>('length');
  const [convValue, setConvValue] = useState('1');
  const [convFrom, setConvFrom] = useState('km');
  const [convTo, setConvTo] = useState('m');

  const pushHistory = (expr: string, result: string, mod: CalcModule) => {
    setHistory((prev) => [
      { id: `h-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, expression: expr, result, module: mod },
      ...prev.slice(0, 19),
    ]);
  };

  const handleAppend = (token: string) => {
    setErrorMsg(null);
    setExpression((prev) => {
      const next = prev === '0' && /^\d$/.test(token) ? token : prev + token;
      setDisplay(next || '0');
      return next;
    });
  };

  const handleClear = () => {
    setExpression('');
    setDisplay('0');
    setErrorMsg(null);
  };

  const handleBackspace = () => {
    setErrorMsg(null);
    setExpression((prev) => {
      const next = prev.slice(0, -1);
      setDisplay(next || '0');
      return next;
    });
  };

  const handleEvaluate = () => {
    const target = expression || display;
    try {
      const val = evaluateExpression(target);
      const formatted = formatCalcNumber(val);
      pushHistory(target, formatted, activeModule);
      setDisplay(formatted);
      setExpression(formatted);
      setErrorMsg(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error');
    }
  };

  const handleScientific = (op: string) => {
    try {
      const currentVal = expression ? evaluateExpression(expression) : Number(display);
      const val = applyScientificOp(op, currentVal, angleUnit);
      const formatted = formatCalcNumber(val);
      pushHistory(`${op}(${currentVal})`, formatted, 'scientific');
      setDisplay(formatted);
      setExpression(formatted);
      setErrorMsg(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Invalid operation');
    }
  };

  const currentNumericValue = useMemo(() => {
    const parsed = Number(display);
    return Number.isFinite(parsed) ? parsed : 0;
  }, [display]);

  const baseConversions = useMemo(() => convertBase(progInput, progBase), [progInput, progBase]);

  const handleCategoryChange = (cat: ConverterCategory) => {
    setConvCategory(cat);
    const units = CONVERTER_UNITS[cat];
    setConvFrom(units[0].id);
    setConvTo(units[1]?.id ?? units[0].id);
  };

  const convertedOutput = useMemo(() => {
    const num = Number(convValue);
    if (!Number.isFinite(num)) return '0';
    return formatCalcNumber(convertUnit(num, convCategory, convFrom, convTo));
  }, [convValue, convCategory, convFrom, convTo]);

  const handleBitwiseClick = (op: 'AND' | 'OR' | 'XOR' | 'LSH' | 'RSH') => {
    const currentDec = Number(baseConversions.DEC);
    setBitwiseOperandA(currentDec);
    setPendingBitwiseOp(op);
    setProgInput('0');
  };

  const handleProgrammerEquals = () => {
    if (bitwiseOperandA === null || !pendingBitwiseOp) return;
    const operandB = Number(baseConversions.DEC);
    const result = applyBitwiseOp(bitwiseOperandA, operandB, pendingBitwiseOp);
    const formatted = String(result);
    pushHistory(`${bitwiseOperandA} ${pendingBitwiseOp} ${operandB}`, formatted, 'programmer');
    setProgBase('DEC');
    setProgInput(formatted);
    setBitwiseOperandA(null);
    setPendingBitwiseOp(null);
  };

  const btnBase =
    'h-10 rounded-md text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 active:scale-[0.98]';
  const btnNum = `${btnBase} bg-slate-800 hover:bg-slate-700 text-slate-100 font-mono-tabular`;
  const btnOp = `${btnBase} bg-slate-800/60 hover:bg-slate-700/80 os-accent-text border border-slate-700/60`;
  const btnEq = `${btnBase} os-accent-bg text-white font-semibold`;

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100">
      {/* Module Switcher Header */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-slate-800 bg-slate-950/60">
        <div role="tablist" aria-label="Calculator Modules" className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
          {MODULE_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeModule === tab.id}
              onClick={() => setActiveModule(tab.id)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap ${
                activeModule === tab.id
                  ? 'os-accent-bg text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setShowHistory((v) => !v)}
          aria-label="Toggle calculation history"
          className={`p-1.5 rounded-md transition-colors ${
            showHistory ? 'os-accent-soft-bg os-accent-text' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
          }`}
        >
          <History className="w-4 h-4" />
        </button>
      </div>

      {/* History Drawer */}
      {showHistory ? (
        <div className="flex-1 flex flex-col p-3 overflow-y-auto os-scroll">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-300">Calculation History</span>
            {history.length > 0 && (
              <button
                type="button"
                onClick={() => setHistory([])}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200"
              >
                <RotateCcw className="w-3 h-3" />
                Clear
              </button>
            )}
          </div>
          {history.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-xs text-slate-500">
              No calculations recorded yet.
            </div>
          ) : (
            <div className="space-y-1.5">
              {history.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setDisplay(item.result);
                    setExpression(item.result);
                    setShowHistory(false);
                  }}
                  className="w-full text-right p-2.5 rounded-md bg-slate-950/60 hover:bg-slate-800 border border-slate-800 transition-colors"
                >
                  <div className="text-[11px] text-slate-400 font-mono-tabular">
                    {item.expression} =
                  </div>
                  <div className="text-sm font-semibold text-slate-100 font-mono-tabular">
                    {item.result}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : activeModule === 'programmer' ? (
        /* Programmer Module */
        <div className="flex-1 flex flex-col p-3 gap-3 overflow-y-auto os-scroll">
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>
                {pendingBitwiseOp ? `${bitwiseOperandA} ${pendingBitwiseOp} ...` : 'Base Converter & Bitwise'}
              </span>
              <span className="font-mono-tabular os-accent-text">{progBase}</span>
            </div>
            <div className="text-right text-2xl font-semibold font-mono-tabular text-white truncate">
              {progInput || '0'}
            </div>
            <div className="grid grid-cols-1 gap-1 pt-2 border-t border-slate-800/80">
              {(['HEX', 'DEC', 'OCT', 'BIN'] as NumberBase[]).map((base) => (
                <button
                  key={base}
                  type="button"
                  onClick={() => {
                    setProgBase(base);
                    setProgInput(baseConversions[base]);
                  }}
                  className={`flex items-center justify-between px-2 py-1 rounded text-xs font-mono-tabular transition-colors ${
                    progBase === base
                      ? 'os-accent-soft-bg os-accent-text'
                      : 'text-slate-300 hover:bg-slate-900'
                  }`}
                >
                  <span className="font-semibold w-10 text-left">{base}</span>
                  <span className="truncate">{baseConversions[base]}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-5 gap-1.5">
            {(['AND', 'OR', 'XOR', 'LSH', 'RSH'] as const).map((op) => (
              <button key={op} type="button" onClick={() => handleBitwiseClick(op)} className={btnOp}>
                {op}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-4 gap-1.5 flex-1">
            {['A', 'B', 'C', 'D', 'E', 'F', '7', '8', '9', '4', '5', '6', '1', '2', '3', '0'].map((key) => {
              const isHex = ['A', 'B', 'C', 'D', 'E', 'F'].includes(key);
              const digitVal = parseInt(key, 16);
              const radix = progBase === 'BIN' ? 2 : progBase === 'OCT' ? 8 : progBase === 'DEC' ? 10 : 16;
              const disabled = digitVal >= radix || (isHex && progBase !== 'HEX');
              return (
                <button
                  key={key}
                  type="button"
                  disabled={disabled}
                  onClick={() =>
                    setProgInput((prev) => (prev === '0' ? key : prev + key))
                  }
                  className={`${btnNum} disabled:opacity-30 disabled:pointer-events-none`}
                >
                  {key}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => {
                setProgInput('0');
                setBitwiseOperandA(null);
                setPendingBitwiseOp(null);
              }}
              className={btnOp}
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setProgInput((prev) => (prev.length > 1 ? prev.slice(0, -1) : '0'))}
              className={btnOp}
            >
              Backspace
            </button>
            <button type="button" onClick={handleProgrammerEquals} className={btnEq}>
              =
            </button>
          </div>
        </div>
      ) : activeModule === 'converter' ? (
        /* Unit Converter Module */
        <div className="flex-1 flex flex-col p-3 gap-3 overflow-y-auto os-scroll">
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            {(['length', 'storage', 'temperature'] as ConverterCategory[]).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => handleCategoryChange(cat)}
                  className={`flex-1 py-1.5 rounded text-xs font-medium capitalize transition-colors ${
                  convCategory === cat
                    ? 'bg-slate-800 os-accent-text'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-3">
            <div>
              <label htmlFor="conv-from-input" className="block text-[11px] text-slate-400 mb-1">
                From
              </label>
              <div className="flex gap-2">
                <input
                  id="conv-from-input"
                  type="number"
                  value={convValue}
                  onChange={(e) => setConvValue(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded px-3 py-2 text-sm font-mono-tabular text-slate-100 focus:outline-none focus:border-[var(--os-accent-hover)]"
                />
                <select
                  aria-label="From unit"
                  value={convFrom}
                  onChange={(e) => setConvFrom(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-[var(--os-accent-hover)]"
                >
                  {CONVERTER_UNITS[convCategory].map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="conv-to-select" className="block text-[11px] text-slate-400 mb-1">
                To
              </label>
              <div className="flex gap-2 items-center">
                <div
                  data-testid="converter-result"
                  className="flex-1 bg-slate-900/60 border border-slate-800 rounded px-3 py-2 text-sm font-mono-tabular font-semibold os-accent-text"
                >
                  {convertedOutput}
                </div>
                <select
                  id="conv-to-select"
                  aria-label="To unit"
                  value={convTo}
                  onChange={(e) => setConvTo(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-[var(--os-accent-hover)]"
                >
                  {CONVERTER_UNITS[convCategory].map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              const prevFrom = convFrom;
              setConvFrom(convTo);
              setConvTo(prevFrom);
            }}
            className="py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700"
          >
            Swap Units
          </button>
        </div>
      ) : (
        /* Standard & Scientific Modules */
        <div className="flex-1 flex flex-col p-3 gap-2.5">
          {/* Display */}
          <div className="bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-3 text-right">
            <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
              <span>{memory !== 0 ? `M = ${formatCalcNumber(memory)}` : 'Ready'}</span>
              {activeModule === 'scientific' && (
                <button
                  type="button"
                  onClick={() => setAngleUnit((u) => (u === 'DEG' ? 'RAD' : 'DEG'))}
                  className="px-1.5 py-0.5 rounded bg-slate-900 os-accent-text font-mono-tabular"
                >
                  {angleUnit}
                </button>
              )}
            </div>
            <div className="text-xs text-slate-400 font-mono-tabular h-4 truncate">
              {expression || '\u00A0'}
            </div>
            <div
              data-testid="calc-display"
              className="text-2xl font-semibold text-slate-100 font-mono-tabular truncate mt-0.5"
            >
              {errorMsg ?? display}
            </div>
          </div>

          {/* Memory Row */}
          <div className="grid grid-cols-4 gap-1.5">
            <button type="button" onClick={() => setMemory(0)} className={btnOp}>
              MC
            </button>
            <button
              type="button"
              onClick={() => {
                const m = formatCalcNumber(memory);
                setExpression(m);
                setDisplay(m);
              }}
              className={btnOp}
            >
              MR
            </button>
            <button type="button" onClick={() => setMemory((m) => m + currentNumericValue)} className={btnOp}>
              M+
            </button>
            <button type="button" onClick={() => setMemory((m) => m - currentNumericValue)} className={btnOp}>
              M-
            </button>
          </div>

          {/* Scientific Row (visible in Scientific module) */}
          {activeModule === 'scientific' && (
            <div className="grid grid-cols-5 gap-1.5">
              {[
                { label: 'sin', action: () => handleScientific('sin') },
                { label: 'cos', action: () => handleScientific('cos') },
                { label: 'tan', action: () => handleScientific('tan') },
                { label: 'ln', action: () => handleScientific('ln') },
                { label: 'log', action: () => handleScientific('log') },
                { label: '√x', action: () => handleScientific('sqrt') },
                { label: 'x²', action: () => handleScientific('sq') },
                { label: 'x^y', action: () => handleAppend('^') },
                { label: 'n!', action: () => handleScientific('fact') },
                { label: 'π', action: () => handleAppend(String(Math.PI.toFixed(6))) },
              ].map((item) => (
                <button key={item.label} type="button" onClick={item.action} className={btnOp}>
                  {item.label}
                </button>
              ))}
            </div>
          )}

          {/* Main Keypad */}
          <div className="grid grid-cols-4 gap-1.5 flex-1">
            <button type="button" onClick={handleClear} className={btnOp}>
              C
            </button>
            <button type="button" onClick={() => handleAppend('(')} className={btnOp}>
              (
            </button>
            <button type="button" onClick={() => handleAppend(')')} className={btnOp}>
              )
            </button>
            <button type="button" onClick={handleBackspace} aria-label="Backspace" className={btnOp}>
              <Delete className="w-4 h-4 mx-auto" />
            </button>

            <button type="button" onClick={() => handleAppend('7')} className={btnNum}>
              7
            </button>
            <button type="button" onClick={() => handleAppend('8')} className={btnNum}>
              8
            </button>
            <button type="button" onClick={() => handleAppend('9')} className={btnNum}>
              9
            </button>
            <button type="button" onClick={() => handleAppend('/')} aria-label="Divide" className={btnOp}>
              ÷
            </button>

            <button type="button" onClick={() => handleAppend('4')} className={btnNum}>
              4
            </button>
            <button type="button" onClick={() => handleAppend('5')} className={btnNum}>
              5
            </button>
            <button type="button" onClick={() => handleAppend('6')} className={btnNum}>
              6
            </button>
            <button type="button" onClick={() => handleAppend('*')} aria-label="Multiply" className={btnOp}>
              ×
            </button>

            <button type="button" onClick={() => handleAppend('1')} className={btnNum}>
              1
            </button>
            <button type="button" onClick={() => handleAppend('2')} className={btnNum}>
              2
            </button>
            <button type="button" onClick={() => handleAppend('3')} className={btnNum}>
              3
            </button>
            <button type="button" onClick={() => handleAppend('-')} aria-label="Subtract" className={btnOp}>
              −
            </button>

            <button type="button" onClick={() => handleAppend('0')} className={btnNum}>
              0
            </button>
            <button type="button" onClick={() => handleAppend('.')} className={btnNum}>
              .
            </button>
            <button type="button" onClick={handleEvaluate} className={btnEq}>
              =
            </button>
            <button type="button" onClick={() => handleAppend('+')} aria-label="Add" className={btnOp}>
              +
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
