import FullCalendar, { type DatesSetInfo, type EventClickInfo, type EventInput } from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/react/daygrid';
import timeGridPlugin from '@fullcalendar/react/timegrid';
import listPlugin from '@fullcalendar/react/list';
import classicThemePlugin from '@fullcalendar/react/themes/classic';
import { Box } from '@mui/material';
import '@fullcalendar/react/skeleton.css';
import '@fullcalendar/react/themes/classic/theme.css';
import '@fullcalendar/react/themes/classic/palette.css';
import './fullCalendar.css';
import { dateOnlyFromCalendarValue, getContinuationOnlyOverflowDates } from '../utils/fullCalendarDates';

export interface CalendarVisibleRange {
  start: string;
  endExclusive: string;
}

interface RentalCalendarProps {
  events: EventInput[];
  onRentalClick: (rentalId: string) => void;
  onVisibleRangeChange: (range: CalendarVisibleRange) => void;
}

export default function RentalCalendar({ events, onRentalClick, onVisibleRangeChange }: RentalCalendarProps) {
  const continuationOnlyOverflowDates = getContinuationOnlyOverflowDates(events);

  const handleDatesSet = (info: DatesSetInfo) => {
    onVisibleRangeChange({
      start: dateOnlyFromCalendarValue(info.startStr),
      endExclusive: dateOnlyFromCalendarValue(info.endStr),
    });
  };

  const handleEventClick = (info: EventClickInfo) => {
    onRentalClick(info.event.extendedProps.rentalId ?? info.event.id);
  };

  return (
    <Box sx={{ overflowX: { xs: 'auto', md: 'visible' } }}>
      <Box className="recap-fullcalendar" sx={{ minWidth: { xs: 720, md: 0 } }}>
        <FullCalendar
          plugins={[classicThemePlugin, dayGridPlugin, timeGridPlugin, listPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            start: 'prev,next today',
            center: 'title',
            end: 'dayGridMonth,timeGridWeek,timeGridDay,listMonth',
          }}
          events={events}
          datesSet={handleDatesSet}
          eventClick={handleEventClick}
          eventSlicing
          dayMaxEventRows={5}
          moreLinkClick="popover"
          moreLinkDidMount={(info) => {
            const dayElement = info.el.closest<HTMLElement>('[data-date]');
            const date = dayElement?.dataset.date;
            info.el.style.display = date && continuationOnlyOverflowDates.has(date) ? 'none' : '';
          }}
          displayEventTime={false}
          eventOrder="start,-duration,title"
          eventOrderStrict
          fixedWeekCount={false}
          navLinks
          nowIndicator
          timeZone="local"
          height="auto"
          noEventsText="No rentals for this period"
          views={{
            dayGridMonth: { dayMaxEventRows: 5 },
            timeGridWeek: { dayMaxEventRows: 5 },
            timeGridDay: { dayMaxEventRows: 5 },
            listMonth: { noEventsText: 'No rentals for this month' },
          }}
        />
      </Box>
    </Box>
  );
}
