import React, { useMemo } from 'react';
import Button from './common/Button';
import IconLeft from './common/IconLeft';
import IconRight from './common/IconRight';
import { useAppDispatch, useAppSelector } from '../stores/ConfigHooks';
import { setCurrentDate, setToday } from '../stores/modules/dates';
import { getStringDateFormat } from '../utils/GetStringDateFormat';

const Header = () => {
  const { currentDate } = useAppSelector((state) => state.dates);
  const dispatch = useAppDispatch();

  // 고쳐봐야 하는 부분
  const displayDate = useMemo(() => {
    const date = new Date(currentDate);

    const firstDayOfTheMonth = date.getDay();

    if (date.getDate() <= firstDayOfTheMonth) {
      return `${date.getFullYear()}년 ${date.getMonth()}월 ~ ${date.getMonth() + 1}월`;
    } else {
      return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
    }
  }, [currentDate]);

  const handleTodayBtnClick = () => {
    dispatch(setToday());
  };

  const handlePrevWeek = () => {
    const prevWeek = new Date(currentDate);
    prevWeek.setDate(new Date(currentDate).getDate() - 7);

    dispatch(setCurrentDate(prevWeek.toLocaleDateString()));
  };

  const handleNextWeek = () => {
    const nextWeek = new Date(currentDate);
    nextWeek.setDate(new Date(currentDate).getDate() + 7);

    dispatch(setCurrentDate(nextWeek.toLocaleDateString()));
  };

  return (
    <>
      <header className="flex flex-col items-center px-4 justify-center w-full h-[80px] mt-[50px]">
        <div className="flex items-center">
          <Button className="p-1 sm:mx-1 hover:bg-line hover:rounded-full" onClick={handlePrevWeek}>
            <IconLeft className="w-8 h-8" />
          </Button>

          <h2 className="ml-4 text-md sm:text-xl text-body">{displayDate}</h2>

          <Button className="p-1 sm:mx-1 hover:bg-line hover:rounded-full" onClick={handleNextWeek}>
            <IconRight className="w-8 h-8" />
          </Button>
        </div>
        <Button onClick={handleTodayBtnClick} className="group rounded px-3 mr-5 ml-5 hover:bg-hover bg-primary text-[white]">
          오늘
          {/* <p className="absolute text-body rounded hidden text-center group-hover:block">{getStringDateFormat(new Date(), '-')}</p> */}
        </Button>
      </header>
    </>
  );
};

export default Header;