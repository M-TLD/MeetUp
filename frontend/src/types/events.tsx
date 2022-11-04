export type EventDetail = {
    start: string;
    end: string;
    title: string;
  };
  
export type NewEvent = {
  date: string;
  eventDetail: EventDetail;
};

export type SelectedEvent = {
  date: string;
  index: number;
};

export type EventModalData = {
  date: string;
  startTime: string;
};

export type HolidayDetail = {
  locdate: string;
  dateName: string;
}

export type tSchedule = {
  id : string,
  start : string,
  end : string,
  title : string,
  content : string,
  userId : string, 
  userName: string, 
  meetupName: string,
  meetupColor: string
}

export type tScheduleDetail = {

}

export type tMettingDetail = {
  
}