import React from "react";
import { UNITS } from '../../common/Constant';
import { IBodyMeasurement } from '../../interface/IBodyMeasurement';
import moment from 'moment';
import { TrendingDown, TrendingUp, Minus } from "lucide-react";

interface MeasurementHistoryProps {
  measurements: IBodyMeasurement[];
}

const METRICS = [
  { key: 'Weight',     label: 'Weight',     unit: UNITS.WEIGHT.KILO,  lowerIsBetter: true  },
  { key: 'Waist',      label: 'Waist',      unit: UNITS.HEIGHT.CENTI, lowerIsBetter: true  },
  { key: 'BodyFat',    label: 'Body Fat',   unit: '%',                lowerIsBetter: true  },
  { key: 'BodyHip',    label: 'Hips',       unit: UNITS.HEIGHT.CENTI, lowerIsBetter: true  },
  { key: 'Neck',       label: 'Neck',       unit: UNITS.HEIGHT.CENTI, lowerIsBetter: true  },
  { key: 'Chest',      label: 'Chest',      unit: UNITS.HEIGHT.CENTI, lowerIsBetter: true  },
  { key: 'UpperArm',   label: 'Upper Arm',  unit: UNITS.HEIGHT.CENTI, lowerIsBetter: false },
  { key: 'Quadriceps', label: 'Quadriceps', unit: UNITS.HEIGHT.CENTI, lowerIsBetter: false },
];

const MAX_COLS = 5;

export default function MeasurementHistory({ measurements }: MeasurementHistoryProps) {
  if (!measurements.length) {
    return (
      <div className="bg-white border w-full p-6 text-center text-gray-400 text-sm">
        No measurement history available.
      </div>
    );
  }

  // Deduplicate by DateRange keeping highest IdWeeklyStats, sort oldest→newest, take last MAX_COLS
  const byDate = new Map<string, IBodyMeasurement>();
  measurements.forEach(m => {
    if (!m.DateRange) return;
    const existing = byDate.get(m.DateRange);
    if (!existing || Number(m.IdWeeklyStats ?? 0) > Number(existing.IdWeeklyStats ?? 0)) {
      byDate.set(m.DateRange, m);
    }
  });
  const cols = Array.from(byDate.values())
    .sort((a, b) =>
      moment(a.DateRange, 'DD-MM-YYYY').valueOf() -
      moment(b.DateRange, 'DD-MM-YYYY').valueOf()
    )
    .slice(-MAX_COLS);

  const formatDate = (d: string | undefined) =>
    d ? moment(d, 'DD-MM-YYYY').format('D MMM') : '—';

  return (
    <div className="bg-white border w-full overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h2 className="text-base font-semibold">Measurement History</h2>
        <span className="text-xs text-gray-400">last {cols.length} entries</span>
      </div>

      <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
        <table className="w-full text-sm" style={{ minWidth: `${cols.length * 72 + 110}px` }}>
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 sticky left-0 bg-gray-50 z-10 w-[110px]">
                Metric
              </th>
              {cols.map((col, i) => (
                <th key={i} className="py-2 px-2 text-center text-xs font-medium text-gray-500 min-w-[72px]">
                  <div>{formatDate(col.DateRange)}</div>
                  {i === cols.length - 1 && (
                    <div className="text-blue-500 font-semibold">Latest</div>
                  )}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {METRICS.map(({ key, label, unit, lowerIsBetter }) => (
              <tr key={key} className="hover:bg-gray-50">
                <td className="py-2 px-3 sticky left-0 bg-white z-10 border-r">
                  <div className="text-xs font-medium text-gray-700">{label}</div>
                  <div className="text-xs text-gray-400">{unit}</div>
                </td>

                {cols.map((col, i) => {
                  const value = col[key as keyof IBodyMeasurement] as number | undefined;
                  const prev  = i > 0 ? cols[i - 1][key as keyof IBodyMeasurement] as number | undefined : undefined;
                  const diff  = value != null && prev != null ? value - prev : null;
                  const isGood    = diff == null ? null : lowerIsBetter ? diff < 0 : diff > 0;
                  const isNeutral = diff === 0;
                  const isLatest  = i === cols.length - 1;

                  return (
                    <td key={i} className={`py-2 px-2 text-center ${isLatest ? 'bg-blue-50' : ''}`}>
                      {value != null ? (
                        <>
                          <div className={`text-xs font-semibold ${isLatest ? 'text-blue-700' : 'text-gray-800'}`}>
                            {value.toFixed(1)}
                          </div>
                          {diff != null && (
                            <div className={`flex items-center justify-center gap-0.5 text-xs font-medium mt-0.5 ${
                              isNeutral ? 'text-gray-400' : isGood ? 'text-green-500' : 'text-red-500'
                            }`}>
                              {isNeutral
                                ? <Minus size={10} />
                                : diff < 0
                                ? <TrendingDown size={10} />
                                : <TrendingUp size={10} />}
                              {diff > 0 ? '+' : ''}{diff.toFixed(1)}
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
