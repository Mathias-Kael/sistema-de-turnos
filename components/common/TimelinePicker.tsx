import React, { useState, useMemo, useRef } from 'react';
import { timeToMinutes, minutesToTime } from '../../utils/availability';

export interface TimeSlot {
  start: string;
  end: string;
}

export interface TimelinePickerProps {
  date: Date;
  businessHours: TimeSlot;
  existingBookings: TimeSlot[];
  selectionDuration: number;
  onTimeSelect: (selection: TimeSlot) => void;
  onTimeClear: () => void;
  allowBusinessHoursExtension?: boolean;
  onBusinessHoursChange?: (newHours: TimeSlot) => void;
  snapInterval?: number;
  extendedHours?: TimeSlot;
  viewportRange?: TimeSlot;
}

const hasOverlap = (slot1: TimeSlot, slot2: TimeSlot): boolean => {
  const start1 = timeToMinutes(slot1.start, 'open');
  const end1 = timeToMinutes(slot1.end, 'close');
  const start2 = timeToMinutes(slot2.start, 'open');
  const end2 = timeToMinutes(slot2.end, 'close');
  return (start1 < end2) && (end1 > start2);
};

const TimelinePicker: React.FC<TimelinePickerProps> = ({
  businessHours,
  existingBookings,
  selectionDuration,
  onTimeSelect,
  onTimeClear,
  snapInterval = 10,
  extendedHours,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [hoverMinutes, setHoverMinutes] = useState<number | null>(null);

  const effectiveRange = useMemo(() => {
    if (extendedHours) {
      return {
        start: Math.min(timeToMinutes(businessHours.start, 'open'), timeToMinutes(extendedHours.start, 'open')),
        end: Math.max(timeToMinutes(businessHours.end, 'close'), timeToMinutes(extendedHours.end, 'close')),
      };
    }
    return {
      start: timeToMinutes(businessHours.start, 'open'),
      end: timeToMinutes(businessHours.end, 'close'),
    };
  }, [businessHours, extendedHours]);

  const totalMinutes = effectiveRange.end - effectiveRange.start;
  const pixelsPerMinute = 2;
  const timelineWidth = totalMinutes * pixelsPerMinute;

  const timeMarkers = useMemo(() => {
    const markers: { time: string; minutes: number }[] = [];
    for (let m = effectiveRange.start; m <= effectiveRange.end; m += 30) {
      markers.push({ time: minutesToTime(m), minutes: m });
    }
    return markers;
  }, [effectiveRange]);

  const checkOverlap = (proposedSlot: TimeSlot): boolean => {
    return existingBookings.some(booking => hasOverlap(proposedSlot, booking));
  };

  const isWithinBusinessHours = (proposedSlot: TimeSlot): boolean => {
    const start = timeToMinutes(proposedSlot.start, 'open');
    const end = timeToMinutes(proposedSlot.end, 'close');
    const bizStart = timeToMinutes(businessHours.start, 'open');
    const bizEnd = timeToMinutes(businessHours.end, 'close');
    return start >= bizStart && end <= bizEnd;
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickedMinutes = Math.floor((clickX / pixelsPerMinute) + effectiveRange.start);
    const snappedMinutes = Math.round(clickedMinutes / snapInterval) * snapInterval;
    const proposedSlot: TimeSlot = {
      start: minutesToTime(snappedMinutes),
      end: minutesToTime(snappedMinutes + selectionDuration),
    };
    if (!checkOverlap(proposedSlot)) {
      setSelectedSlot(proposedSlot);
      onTimeSelect(proposedSlot);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const hoverX = e.clientX - rect.left;
    const hoverMins = Math.floor((hoverX / pixelsPerMinute) + effectiveRange.start);
    const snapped = Math.round(hoverMins / snapInterval) * snapInterval;
    setHoverMinutes(snapped);
  };

  const handleMouseLeave = () => {
    setHoverMinutes(null);
  };

  const handleClear = () => {
    setSelectedSlot(null);
    onTimeClear();
  };

  const minutesToX = (minutes: number) => {
    return (minutes - effectiveRange.start) * pixelsPerMinute;
  };

  const renderBookings = () => {
    return existingBookings.map((booking, idx) => {
      const start = timeToMinutes(booking.start, 'open');
      const end = timeToMinutes(booking.end, 'close');
      const x = minutesToX(start);
      const width = (end - start) * pixelsPerMinute;
      return (
        <div
          key={idx}
          className="absolute h-full bg-gray-400 opacity-60"
          style={{ left: x + 'px', width: width + 'px' }}
          title={'Ocupado: ' + booking.start + ' - ' + booking.end}
        />
      );
    });
  };

  const renderGhostSelector = () => {
    if (hoverMinutes === null) return null;
    const proposedSlot: TimeSlot = {
      start: minutesToTime(hoverMinutes),
      end: minutesToTime(hoverMinutes + selectionDuration),
    };
    const hasConflict = checkOverlap(proposedSlot);
    const x = minutesToX(hoverMinutes);
    const width = selectionDuration * pixelsPerMinute;
    return (
      <div
        className={'absolute h-full opacity-30 pointer-events-none ' + (hasConflict ? 'bg-red-400' : 'bg-green-400')}
        style={{ left: x + 'px', width: width + 'px' }}
      />
    );
  };

  const renderSelectedSlot = () => {
    if (!selectedSlot) return null;
    const start = timeToMinutes(selectedSlot.start, 'open');
    const end = timeToMinutes(selectedSlot.end, 'close');
    const x = minutesToX(start);
    const width = (end - start) * pixelsPerMinute;
    const hasConflict = checkOverlap(selectedSlot);
    const withinHours = isWithinBusinessHours(selectedSlot);
    return (
      <div
        className={'absolute h-full border-2 ' + (hasConflict ? 'bg-red-100 border-red-500' : withinHours ? 'bg-green-100 border-green-500' : 'bg-yellow-100 border-yellow-500')}
        style={{ left: x + 'px', width: width + 'px' }}
      >
        <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold">
          {selectedSlot.start} - {selectedSlot.end}
        </div>
      </div>
    );
  };

  const renderExtendedHoursBackground = () => {
    if (!extendedHours) return null;

    const bizStart = timeToMinutes(businessHours.start, 'open');
    const bizEnd = timeToMinutes(businessHours.end, 'close');
    const extStart = timeToMinutes(extendedHours.start, 'open');
    const extEnd = timeToMinutes(extendedHours.end, 'close');
    
    const beforeExtension = extStart < bizStart;
    const afterExtension = extEnd > bizEnd;
    
    return (
      <>
        {beforeExtension && (
          <div
            className="absolute h-full bg-blue-50 opacity-50 pointer-events-none"
            style={{
              left: minutesToX(extStart) + 'px',
              width: (bizStart - extStart) * pixelsPerMinute + 'px'
            }}
            title="Horario extendido"
          />
        )}
        {afterExtension && (
          <div
            className="absolute h-full bg-blue-50 opacity-50 pointer-events-none"
            style={{
              left: minutesToX(bizEnd) + 'px',
              width: (extEnd - bizEnd) * pixelsPerMinute + 'px'
            }}
            title="Horario extendido"
          />
        )}
      </>
    );
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex gap-4 text-xs text-gray-600">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-gray-400 opacity-60"></div>
          <span>Ocupado</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-green-100 border-2 border-green-500"></div>
          <span>Disponible</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-red-100 border-2 border-red-500"></div>
          <span>Conflicto</span>
        </div>
        {extendedHours && (
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-blue-50 opacity-50 border border-blue-300"></div>
            <span>Horario extendido</span>
          </div>
        )}
      </div>
      <div className="overflow-x-auto border border-gray-300 rounded-lg bg-white p-4">
        <div className="relative" style={{ width: timelineWidth + 'px', minWidth: '100%' }}>
          <div className="flex justify-between mb-2 text-xs text-gray-500">
            {timeMarkers.map(marker => (
              <div key={marker.time} className="text-center" style={{ minWidth: '60px' }}>
                {marker.time}
              </div>
            ))}
          </div>
          <div
            ref={containerRef}
            className="relative h-16 bg-gray-50 border border-gray-200 rounded cursor-pointer"
            onClick={handleTimelineClick}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ width: timelineWidth + 'px' }}
          >
            {renderExtendedHoursBackground()}
            {timeMarkers.map(marker => (
              <div
                key={marker.time}
                className="absolute top-0 bottom-0 border-l border-gray-300"
                style={{ left: minutesToX(marker.minutes) + 'px' }}
              />
            ))}
            {renderBookings()}
            {renderGhostSelector()}
            {renderSelectedSlot()}
          </div>
        </div>
      </div>
      <div className="flex justify-between items-center text-sm">
        <div>
          {selectedSlot ? (
            <div>
              <span className="font-semibold">Seleccionado:</span>{' '}
              {selectedSlot.start} - {selectedSlot.end}
              {checkOverlap(selectedSlot) && (
                <span className="ml-2 text-red-600 font-semibold"> Conflicto detectado</span>
              )}
            </div>
          ) : (
            <span className="text-gray-500">Haz click en la línea de tiempo para seleccionar un horario</span>
          )}
        </div>
        {selectedSlot && (
          <button
            type="button"
            onClick={handleClear}
            className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
          >
            Limpiar
          </button>
        )}
      </div>
      <div className="text-xs text-gray-600">
        Duración de la reserva: <strong>{selectionDuration} minutos</strong>
      </div>
    </div>
  );
};

export default TimelinePicker;