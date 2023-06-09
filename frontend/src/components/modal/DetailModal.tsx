import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../stores/ConfigHooks';
import { setDetailModalOpen } from '../../stores/modules/modal';
import { getStringDateFormat } from '../../utils/GetStringDateFormat';
import { createTimeOptions, Option } from '../../utils/CreateTimeOptions';
import { useSelector } from 'react-redux';
import { ModalSelector } from '../../stores/modules/modal';
import { detailSelector, fetchScheduleDetail } from '../../stores/modules/schedules';
import { setEditModalOpen } from '../../stores/modules/modal';
import { setDeleteModalOpen } from '../../stores/modules/modal';
import { fetchAlarmChannelList } from '../../stores/modules/channelAlarm';
import webex from '../../assets/webex_icon.png';
import { fetchGroupList, groupSelector } from '../../stores/modules/groups';
import { tScheduleDetail } from '../../types/events';
import { useParams } from 'react-router-dom';

const DetailModal = () => {
  const dispatch = useAppDispatch();
  const detailModalSelector = useSelector(ModalSelector);
  const scheduleDetail = useSelector(detailSelector).scheduleModal.scheduleDetail;
  const myId = localStorage.getItem('id');
  const params = useParams();

  const handleToggleModal = useCallback(() => {
    dispatch(setDetailModalOpen('close'));
  }, []);

  const editMeeting = (scheduleDetail: tScheduleDetail) => {
    dispatch(setEditModalOpen([scheduleDetail.id, 'meeting']));
    dispatch(fetchAlarmChannelList(scheduleDetail.managerId));
    dispatch(fetchGroupList());
    handleToggleModal();
  };
  // const editMeeting = () => {
  //   console.log(scheduleDetail);
  // };
  const editSchedule = (scheduleDetail: tScheduleDetail) => {
    dispatch(setEditModalOpen([scheduleDetail.id, 'schedule']));
    // dispatch(fetchAlarmChannelList(scheduleDetail.userId));
    handleToggleModal();
  };

  const deleteMeeting = () => {
    dispatch(setDeleteModalOpen(['delete', 'meeting']));
    handleToggleModal();
  };

  const deleteSchedule = () => {
    dispatch(setDeleteModalOpen(['delete', 'schedule']));
    handleToggleModal();
  };

  // 컨설턴트 웹엑스 이동
  const moveToManager = () => {
    if (scheduleDetail.diffWebex.includes('https://') || scheduleDetail.diffWebex.includes('http://')) {
      window.open(scheduleDetail.diffWebex, '_blank');
    } else {
      window.open('https://' + scheduleDetail.diffWebex);
    }
  };

  // 학생(신청자) 웹엑스 이동
  const moveToStudent = () => {
    if (scheduleDetail.myWebex.includes('https://') || scheduleDetail.myWebex.includes('http://')) {
      window.open(scheduleDetail.myWebex, '_blank');
    } else {
      window.open('https://' + scheduleDetail.myWebex);
    }
  };

  if (scheduleDetail) {
    return (
      <div className={`${detailModalSelector.detailModalIsOpen ? 'fixed' : 'hidden'} w-[100%] h-[100%] flex justify-center items-center z-30`}>
        <div
          className={`${
            scheduleDetail && detailModalSelector.modalType === 'myMeeting' ? 'w-[600px] h-[600px]' : 'w-[500px] h-[350px]'
          } flex flex-col items-center bg-background z-10 rounded drop-shadow-shadow`}
          onClick={(e: React.MouseEvent<HTMLDivElement>) => {
            e.stopPropagation();
          }}
        >
          <svg
            xmlns="https://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2.5"
            className={`${
              scheduleDetail && detailModalSelector.modalType === 'myMeeting' ? 'ml-[550px]' : 'ml-[455px]'
            } w-6 h-6 stroke-title mt-[15px] cursor-pointer`}
            onClick={handleToggleModal}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
          <div className="flex flex-col p-[20px] ">
            <div className="mt-[10px] flex ">
              {scheduleDetail && detailModalSelector.modalType === 'myMeeting' ? (
                <>
                  <div className="text-s text-title font-bold mr-[15px]">미팅명</div>
                  <p className="font-bold">{scheduleDetail.title}</p>
                </>
              ) : (
                <>
                  <div className="text-s text-title font-bold ml-[25px] mr-[15px] mb-[15px]">제목</div>
                  <p className="font-bold">{scheduleDetail.title}</p>
                </>
              )}
            </div>
            {scheduleDetail && detailModalSelector.modalType === 'myMeeting' ? (
              <>
                <div className="mt-[20px] flex ">
                  <div className="text-s text-title font-bold mr-[15px]">신청자</div>
                  <p>{scheduleDetail.userName}</p>
                </div>
              </>
            ) : null}
            {scheduleDetail && detailModalSelector.modalType === 'myMeeting' && scheduleDetail.partyId ? (
              <>
                <div className="mt-[20px] flex ">
                  <div className="text-s text-title font-bold mr-[15px]">신청그룹</div>
                  <p>{scheduleDetail.partyName}</p>
                </div>
              </>
            ) : null}
            <div className="mt-[20px] flex">
              <div
                className={`${
                  scheduleDetail && detailModalSelector.modalType === 'myMeeting' ? 'ml-[0px]' : 'ml-[25px] mb-[15px]'
                } text-s text-title font-bold mr-[15px]`}
              >
                날짜
              </div>
              {scheduleDetail && detailModalSelector.modalType === 'myMeeting' ? (
                <p>{scheduleDetail.start.slice(0, 10)}</p>
              ) : (
                <p>{scheduleDetail.start.slice(0, 10)}</p>
              )}
            </div>
            <div className="mt-[20px] flex">
              <div
                className={`${
                  scheduleDetail && detailModalSelector.modalType === 'myMeeting' ? 'ml-[0px]' : 'ml-[25px]'
                } text-s text-title font-bold mr-[15px]`}
              >
                시간
              </div>
              {scheduleDetail && detailModalSelector.modalType === 'myMeeting' ? (
                <p>
                  {scheduleDetail.start.slice(11, 16)} - {scheduleDetail.end.slice(11, 16)}
                </p>
              ) : (
                <p>
                  {scheduleDetail.start.slice(11, 16)} - {scheduleDetail.end.slice(11, 16)}
                </p>
              )}
            </div>
            <div className="mt-[20px] flex">
              {scheduleDetail && detailModalSelector.modalType === 'myMeeting' && scheduleDetail.content ? (
                <>
                  <div className="text-s text-title font-bold mr-[15px]">내용</div>
                  <p className="w-[450px]">{scheduleDetail.content}</p>
                </>
              ) : (
                <>
                  <div className="text-s text-title font-bold mr-[15px]"></div>
                  <p className="w-[450px]">{scheduleDetail.content}</p>
                </>
              )}
            </div>
            {scheduleDetail && detailModalSelector.modalType === 'myMeeting' ? (
              <div className={`${!scheduleDetail.content ? 'mt-[0px]' : 'mt-[20px]'} flex flex-col`}>
                <div className="text-s text-title font-bold mb-[20px]">웹엑스 미팅 참여하기</div>
                <div className="flex justify-center gap-[20px] mt-[10px]">
                  {scheduleDetail.diffWebex ? (
                    <div className="flex justify-center items-center gap-x-[50px]">
                      <div className="flex flex-col justify-center items-center">
                        <a href="#" onClick={() => moveToManager()} className="flex flex-col justify-center items-center">
                          <img className="w-[50px]" src={webex} alt="webex" />
                          <p className="font-bold">{scheduleDetail.managerName}</p>
                        </a>
                      </div>
                    </div>
                  ) : scheduleDetail.managerId !== myId ? null : (
                    <div className="w-[200px] bborder-solid border-2 border-point rounded flex justify-center items-center">
                      <a href="/settings">웹엑스 링크를 설정해주세요</a>
                    </div>
                  )}
                  {scheduleDetail.myWebex ? (
                    <div className="flex justify-center items-center gap-x-[50px]">
                      <div className="flex flex-col justify-center items-center">
                        <a href="#" onClick={() => moveToStudent()} className="flex flex-col justify-center items-center">
                          <img className="w-[50px]" src={webex} alt="webex" />
                          <p className="font-bold">{scheduleDetail.userName}</p>
                        </a>
                      </div>
                    </div>
                  ) : scheduleDetail.userId !== myId ? null : (
                    <div className="w-[200px] bborder-solid border-2 border-point rounded flex justify-center items-center">
                      <a href="/settings">웹엑스 링크를 설정해주세요</a>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
          {scheduleDetail && detailModalSelector.modalType === 'myCalendar' ? (
            <div className="flex justify-center items-center gap-[20px] mt-[15px]">
              <button
                onClick={() => editSchedule(scheduleDetail)}
                className="font-bold bg-title hover:bg-hover text-background rounded w-[200px] h-s drop-shadow-button"
              >
                내 스케줄 수정하기
              </button>
              <button
                onClick={deleteSchedule}
                className="text-[16px] font-bold bg-background border-solid border-2 border-cancel text-cancel hover:bg-cancelhover hover:text-background rounded w-[200px] h-s drop-shadow-button"
              >
                내 스케줄 삭제하기
              </button>
            </div>
          ) : !scheduleDetail.isDelete ? (
            <div className={`${scheduleDetail.partyName ? 'mt-[5px]' : 'mt-[40px]'} flex justify-center items-center`}>
              <button
                onClick={deleteMeeting}
                className="text-[16px] font-bold bg-background border-solid border-2 border-cancel text-cancel hover:bg-cancelhover hover:text-background rounded w-[450px] h-s drop-shadow-button"
              >
                미팅 삭제하기
              </button>
            </div>
          ) : scheduleDetail.userId === myId ? (
            <div className={`${scheduleDetail.partyName ? 'mt-[10px]' : 'mt-[40px]'} flex justify-center items-center gap-[20px]`}>
              <button
                onClick={() => editMeeting(scheduleDetail)}
                className="font-bold bg-title hover:bg-hover text-background rounded w-[200px] h-s drop-shadow-button"
              >
                미팅 수정하기
              </button>
              <button
                onClick={deleteMeeting}
                className="text-[16px] font-bold bg-background border-solid border-2 border-cancel text-cancel hover:bg-cancelhover hover:text-background rounded w-[200px] h-s drop-shadow-button"
              >
                미팅 삭제하기
              </button>
            </div>
          ) : scheduleDetail.managerId === myId ? (
            <div className={`${scheduleDetail.partyName ? 'mt-[5px]' : 'mt-[40px]'} flex justify-center items-center`}>
              <button
                onClick={deleteMeeting}
                className="text-[16px] font-bold bg-background border-solid border-2 border-cancel text-cancel hover:bg-cancelhover hover:text-background rounded w-[450px] h-s drop-shadow-button"
              >
                미팅 삭제하기
              </button>
            </div>
          ) : null}
        </div>
        <div
          className="w-[100%] h-[100%] fixed top:0 z-9 bg-[rgba(0,0,0,0.45)]"
          onClick={(e: React.MouseEvent) => {
            e.preventDefault();
          }}
        />
      </div>
    );
  }
  return null;
};

export default DetailModal;
