import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getHours } from '../utils/GetHours';
import { useAppSelector, useAppDispatch } from '../stores/ConfigHooks';
import { getThisWeek } from '../utils/GetThisWeek';
import { deleteEvent, setEventModalData } from '../stores/modules/events';
import { setEventModalOpen } from '../stores/modules/modal';
import { SelectedEvent } from '../types/events';
import { useSelector, useDispatch } from 'react-redux'
import { holidaySelector, fetchHolidays  } from '../stores/modules/holidays';

const WeeklyCalendarBody = () => {
  const { currentDate } = useAppSelector((state) => state.dates);
  const { events } = useAppSelector((state) => state.events);
  const dispatch = useAppDispatch();

  const rDispatch = useDispatch()
  const { holidays } = useSelector(holidaySelector);

  useEffect(() => {
    async function fetchAndSetHolidays() {
      await rDispatch(fetchHolidays())
    }
    fetchAndSetHolidays();
    // const holiday:object = holidays.holidays[0]
    console.log(holidays[0].locdate)
    console.log(weekly) // 0: {isToday: false, day: 0, date: 23, stringDate: '2022-10-23'}
  })


  const deletePopupContainerRef = useRef<HTMLDivElement>(null);

  const [selectedEventPosition, setSelectedEventPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);

  const [selectedEvent, setSelectedEvent] = useState<SelectedEvent | null>(null);

  const weekly = useMemo(() => {
    return getThisWeek(currentDate);
  }, [currentDate]);

  const hours = useMemo(() => {
    return getHours();
  }, []);

  const handleSelectedEvent = (e: React.MouseEvent<HTMLDivElement>, date: string, index: number) => {
    setSelectedEventPosition({ top: e.clientY, left: e.clientX });
    setSelectedEvent({ date, index });

    if (deletePopupContainerRef.current !== null) {
      deletePopupContainerRef.current.style.overflow = 'hidden';
    }
  };

  const handleNewEvent = (stringDate: string, hour: number, minute: string) => {
    const time = hour.toString() + minute;
    setSelectedEventPosition(null);
    dispatch(setEventModalData({ date: stringDate, startTime: time }));
    dispatch(setEventModalOpen());
  };

  const handleDeleteEvent = () => {
    if (selectedEvent !== null) {
      dispatch(deleteEvent(selectedEvent));
    }
    setSelectedEvent(null);
    setSelectedEventPosition(null);

    if (deletePopupContainerRef.current !== null) {
      deletePopupContainerRef.current.style.overflow = 'scroll';
    }
  };

  return (
    <div ref={deletePopupContainerRef} className="calendar-body flex flex-1 max-h-[calc(100vh-9.3rem)] overflow-y-scroll scrollbar-hide pb-10">
      <div className="flex flex-col h-fit">
        {hours.map((hour, index) => {
          return (
            <div className="text-label text-xs h-[50px] text-right pr-2" key={index}>
              {hour}
            </div> // 오전 12시, 오전 1시, ...
          );
        })}
      </div>


      {/* 여기 만져보는 중 */}
      <div className="flex flex-1 h-fit p-2 md:ml-0">
        {weekly.map(({ date, stringDate }) => { //date: 23, stringDate: 2022-10-23
          return (
            <div className="flex flex-1 flex-col relative" key={`${date}-border`}>
              {hours.map((hour, index) => {
                return (
                  <div
                    key={`${hour}${index}`}
                    className="border-1 border-t border-l h-[50px] border-line hover:bg-line"
                    onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const y = e.clientY - rect.top;
                      let minute = '00';
                      if (y > 50 / 2) {
                        minute = '30';
                      }
                      handleNewEvent(stringDate, index, minute);
                    }}
                  />
                );
              })}
              {events[stringDate]?.map((event, index) => {
                // 미팅 일정
                const { title, start, end } = event;
                const startMinute = parseInt(start.slice(-2));
                const startHour = parseInt(start.slice(0, start.length - 2));

                const endMinute = parseInt(end.slice(-2));
                const endHour = parseInt(end.slice(0, end.length - 2));

                const top = startHour * 50 + startMinute;
                let height = (endHour - startHour) * 50 + (endMinute - startMinute);

                if (height < 25) {
                  height = 25;
                }

                return (
                  // 달력에 표시되는 이벤트 일정
                  <>
                  { holidays ? 
                  <div
                    key={`${holidays}${index}`}
                    style={{ top, height }}
                    className={`flex flex-wrap items-center absolute w-full text-background overflow-y-auto bg-title rounded p-1 text-[13px] cursor-pointer`}
                    onClick={(e: React.MouseEvent<HTMLDivElement>) => handleSelectedEvent(e, stringDate, index)}
                  >
                    <div className="mr-1">{holidays[0].dateName}</div>
                  </div> :
                  <div
                    key={`${stringDate}${index}`}
                    style={{ top, height }}
                    className={`flex flex-wrap items-center absolute w-full text-background overflow-y-auto bg-title rounded p-1 text-[13px] cursor-pointer`}
                    onClick={(e: React.MouseEvent<HTMLDivElement>) => handleSelectedEvent(e, stringDate, index)}
                  >
                    <div className="mr-1 w-full text-center">{title}</div>
                  </div>
                  }
                  </>
                );
              })}
            </div>
          );
        })}
      </div>
    
      {/* 원래 있던 것(모달 생성시 이벤트 생성 ) */}
      {/* <div className="flex flex-1 h-fit p-2 md:ml-0">
        {weekly.map(({ date, stringDate }) => { //date: 23, stringDate: 2022-10-23
          return (
            <div className="flex flex-1 flex-col relative" key={`${date}-border`}>
              {hours.map((hour, index) => {
                return (
                  <div
                    key={`${hour}${index}`}
                    className="border-1 border-t border-l h-[50px] border-line hover:bg-line"
                    onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const y = e.clientY - rect.top;
                      let minute = '00';
                      if (y > 50 / 2) {
                        minute = '30';
                      }
                      handleNewEvent(stringDate, index, minute);
                    }}
                  />
                );
              })}
              {events[stringDate]?.map((event, index) => {
                // 미팅 일정
                const { title, start, end } = event;
                const startMinute = parseInt(start.slice(-2));
                const startHour = parseInt(start.slice(0, start.length - 2));

                const endMinute = parseInt(end.slice(-2));
                const endHour = parseInt(end.slice(0, end.length - 2));

                const top = startHour * 50 + startMinute;
                let height = (endHour - startHour) * 50 + (endMinute - startMinute);

                if (height < 24) {
                  height = 24;
                }

                return (
                  // 달력에 표시되는 이벤트 일정
                  <>
                  { holidays ? 
                  <div
                    key={`${holidays}${index}`}
                    style={{ top, height }}
                    className={`flex flex-wrap items-center absolute w-full text-background overflow-y-auto bg-title rounded p-1 text-[13px] cursor-pointer`}
                    onClick={(e: React.MouseEvent<HTMLDivElement>) => handleSelectedEvent(e, stringDate, index)}
                  >
                    <div className="mr-1">{holidays[0].dateName}</div>
                  </div> :
                  <div
                    key={`${stringDate}${index}`}
                    style={{ top, height }}
                    className={`flex flex-wrap items-center absolute w-full text-background overflow-y-auto bg-title rounded p-1 text-[13px] cursor-pointer`}
                    onClick={(e: React.MouseEvent<HTMLDivElement>) => handleSelectedEvent(e, stringDate, index)}
                  >
                    <div className="mr-1 w-full text-center">{title}</div>
                  </div>
                  }
                  </>
                );
              })}
            </div>
          );
        })}
      </div> */}

      {selectedEventPosition !== null && (
        <div
          className="fixed text-sm shadow rounded-lg bg-background cursor-pointer px-4 py-2"
          style={selectedEventPosition}
          onClick={handleDeleteEvent}
        >
          삭제
        </div>
      )}
    </div>
  );
};

export default WeeklyCalendarBody;
