import React, { useEffect, useState } from "react";
import { UNITS } from '../../common/Constant';
import { IBodyMeasurement } from '../../interface/IBodyMeasurement';
import { format, subDays } from 'date-fns';
import moment from 'moment';

interface Measurement {
  date: string;
  weight?: number;
  waist?: number;
  chest?: number;
  hips?: number;
  thighs?: number;
  biceps?: number;
  neck?: number;
  upperArms?: number;
  quadriceps?: number;
}

interface MeasurementHistoryProps {
  measurements: IBodyMeasurement[];
}

export default function MeasurementHistory({ measurements }: MeasurementHistoryProps) {

  const formatDateToDayMonth = (inputDate: string|undefined) => {
    const date = moment(inputDate, 'DD-MM-YYYY');
    if (!date.isValid()) {
      throw new Error('Invalid date format. Expected DD-MM-YYYY');
    }
    return date.format('DD MMM').toUpperCase();
  }


  // Calculate the change between current and previous measurement
  const calculateChange = (current: number | undefined, previous: number | undefined): string => {
    if (current === undefined || previous === undefined) return '';

    const diff = current - previous;
    const formattedDiff = Math.abs(diff).toFixed(1);

    if (diff === 0) return '0';

    // For biceps and similar measurements where increase is good
    if (
      (diff > 0 && ['biceps', 'upperArms', 'quadriceps'].some(part => part in measurements[0])) ||
      (diff < 0 && !['biceps', 'upperArms', 'quadriceps'].some(part => part in measurements[0]))
    ) {
      return `+${formattedDiff}`;
    } else {
      return `-${formattedDiff}`;
    }
  };

  const getChangeColorClass = (change: string, measurementType: string): string => {
    if (!change || change === '0') return 'text-gray-500';
    if (['Biceps', 'UpperArm', 'Quadriceps'].includes(measurementType)) {
      return change.startsWith('+') ? 'text-green-500' : 'text-red-500';
    } else {
      return change.startsWith('-') ? 'text-green-500' : 'text-red-500';
    }
  };

  // The list of measurements to display
  const measurementTypes = [
    { key: 'Weight', label: 'Weight', unit: UNITS.WEIGHT.KILO },
    { key: 'Waist', label: 'Waist', unit: UNITS.HEIGHT.CENTI },
    { key: 'BodyFat', label: 'Body Fat', unit: '%' },
    { key: 'BodyHip', label: 'Hips', unit: UNITS.HEIGHT.CENTI },
    { key: 'Neck', label: 'Neck', unit: UNITS.HEIGHT.CENTI },
    { key: 'Chest', label: 'Chest', unit: UNITS.HEIGHT.CENTI },
    { key: 'UpperArm', label: 'Upper Arm', unit: UNITS.HEIGHT.CENTI },
    { key: 'Quadriceps', label: 'Quadriceps', unit: UNITS.HEIGHT.CENTI }
  ];

  return (
    <div className="bg-white overflow-hidden border w-full">
      <div className="flex justify-between items-center p-4">
        <h2 className="text-lg font-semibold">Measurement History</h2>
      </div>

      <div className="overflow-x-auto w-full" style={{ scrollbarWidth: 'thin', WebkitOverflowScrolling: 'touch' }}>
        <table className="w-full" style={{ minWidth: '100%' }}>
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="py-2 px-2 font-medium text-gray-600 text-xs sticky left-0 bg-gray-50 z-10">MEASUREMENT</th>
              {measurements.map((m, index) => (
                <th key={index} className="py-2 px-2 font-medium text-gray-600 text-xs min-w-[60px]">
                  {formatDateToDayMonth(m.DateRange)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {measurementTypes.map((type) => (
              <tr key={type.key} className="hover:bg-gray-50">
                <td className="py-2 px-2 font-medium sticky left-0 bg-white z-10 border-r">
                  <div className="font-medium text-xs">{type.label}</div>
                  <div className="text-xs text-gray-500">({type.unit})</div>
                </td>

                {measurements.map((measurement, index) => {
                  // Get the value from the measurement data
                  const value = measurement[type.key as keyof typeof measurement] as number;

                  const previousValue = index > 0
                    ? measurements[index - 1][type.key as keyof typeof measurement] as number
                    : undefined;

                  const change = index > 0 && previousValue !== undefined
                    ? calculateChange(value, previousValue)
                    : '';

                  const changeColorClass = getChangeColorClass(change, type.key);

                  return (
                    <td key={index} className="py-2 px-2 text-center">
                      <div className="font-medium text-xs">
                        {type.key === 'BodyFat' ? value?.toFixed(1) : value?.toFixed(1)}
                      </div>
                      {change && (
                        <div className={`text-xs ${changeColorClass}`}>
                          {change}
                        </div>
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