package com.meetup.backend.service.team;

import com.meetup.backend.dto.team.TeamActivateRequestDto;
import com.meetup.backend.dto.team.TeamActivateResponseDto;
import com.meetup.backend.dto.team.TeamResponseDto;
import com.meetup.backend.dto.user.UserInfoDto;
import com.meetup.backend.entity.team.Team;
import com.meetup.backend.entity.team.TeamUser;
import com.meetup.backend.entity.user.RoleType;
import com.meetup.backend.entity.user.User;
import com.meetup.backend.exception.ApiException;
import com.meetup.backend.exception.ExceptionEnum;
import com.meetup.backend.repository.team.TeamRepository;
import com.meetup.backend.repository.team.TeamUserRepository;
import com.meetup.backend.repository.user.UserRepository;
import com.meetup.backend.service.AsyncService;
import com.meetup.backend.service.Client;
import com.meetup.backend.util.converter.JsonConverter;
import com.meetup.backend.util.exception.MattermostEx;
import jakarta.ws.rs.core.Response;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.bis5.mattermost.client4.MattermostClient;
import net.bis5.mattermost.client4.Pager;
import org.json.JSONArray;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.concurrent.ListenableFuture;

import java.io.BufferedInputStream;
import java.util.*;
import java.util.concurrent.CountDownLatch;
import java.util.stream.Collectors;

/**
 * created by myeongseok on 2022/10/21
 * updated by seongmin on 2022/11/15
 */
@Slf4j
@RequiredArgsConstructor
@Transactional(readOnly = true)
@Service
public class TeamUserServiceImpl implements TeamUserService {

    @Autowired
    private final TeamUserRepository teamUserRepository;

    @Autowired
    private final UserRepository userRepository;

    @Autowired
    private final TeamRepository teamRepository;

    @Autowired
    private final AsyncService asyncService;

    @Override
    public List<TeamResponseDto> getTeamByUser(String userId) {
        User user = userRepository.findById(userId).orElseThrow(() -> new ApiException(ExceptionEnum.USER_NOT_FOUND));
        List<TeamResponseDto> teamResponseDtoList = new ArrayList<>();

        for (TeamUser teamUser : teamUserRepository.findByUser(user)) {
            if (!teamUser.isActivate())
                continue;
            teamResponseDtoList.add(TeamResponseDto.of(teamUser.getTeam()));
        }

        return teamResponseDtoList;
    }

    // db에 저장되어 있지 않은 팀만 TeamUser db 저장
    // Teamuser에 이미 저장되어 있는지 확인 할 필요 없음
    @Override
    @Transactional
    public void registerTeamUserFromMattermost(String mmSessionToken, List<Team> teamList) {

        MattermostClient client = Client.getClient();
        client.setAccessToken(mmSessionToken);

        for (Team team : teamList) {
            List<User> userList = new ArrayList<>();
            for (int k = 0; ; k++) {

                Response mmTeamUserResponse = client.getTeamMembers(team.getId(), Pager.of(k, 200)).getRawResponse();

                MattermostEx.apiException(mmTeamUserResponse.getStatus());

                JSONArray userArray = new JSONArray();

                try {
                    userArray = JsonConverter.toJsonArray((BufferedInputStream) mmTeamUserResponse.getEntity());
                } catch (ClassCastException e) {
                    log.error(e.getMessage());
                    log.info("mmChannelUserResponse.getEntity() = {}", mmTeamUserResponse.getEntity());
                    e.printStackTrace();
                }
                if (userArray.isEmpty()) break;

                for (int l = 0; l < userArray.length(); l++) {

                    String userId = userArray.getJSONObject(l).getString("user_id");

                    userList.add(userRepository.findById(userId).orElse(User.builder()
                            .id(userId)
                            .firstLogin(false)
                            .role(RoleType.ROLE_Student)
                            .build()));
                }
            }
            Set<User> userSet = new HashSet<>(userRepository.findAll());
            userRepository.saveAll(userList.stream().filter(user -> !userSet.contains(user)).collect(Collectors.toList()));
            Set<TeamUser> teamUserSet = new HashSet<>(teamUserRepository.findByTeam(team));
            teamUserRepository.saveAll(userList.stream()
                    .map(user -> TeamUser.builder().team(team).user(user).build())
                    .filter(teamUser -> !teamUserSet.contains(teamUser))
                    .collect(Collectors.toList()));
        }
    }

    @Override
    public List<TeamActivateResponseDto> getActivateTeamByUser(String userId) {
        User user = userRepository.findById(userId).orElseThrow(() -> new ApiException(ExceptionEnum.USER_NOT_FOUND));
        List<TeamActivateResponseDto> teamActivateResponseDtoList = new ArrayList<>();
        for (TeamUser teamUser : teamUserRepository.findByUser(user)) {
            teamActivateResponseDtoList.add(TeamActivateResponseDto.of(teamUser));
        }
        return teamActivateResponseDtoList;
    }

    @Override
    @Transactional
    public void activateTeamUser(String userId, List<TeamActivateRequestDto> teamActivateRequestDtoList) {
        User user = userRepository.findById(userId).orElseThrow(() -> new ApiException(ExceptionEnum.USER_NOT_FOUND));
        for (TeamActivateRequestDto teamActivateRequestDto : teamActivateRequestDtoList) {
            Team team = teamRepository.findById(teamActivateRequestDto.getTeamId()).orElseThrow(() -> new ApiException(ExceptionEnum.TEAM_NOT_FOUND));

            TeamUser teamUser = teamUserRepository.findByTeamAndUser(team, user).orElseThrow(() -> new ApiException(ExceptionEnum.TEAM_USER_NOT_FOUND));
            teamUser.changeActivate();
        }
    }

    @Override
    public List<UserInfoDto> getUserByTeam(String mmSessionToken, String teamId) throws InterruptedException {
        Team team = teamRepository.findById(teamId).orElseThrow(() -> new ApiException(ExceptionEnum.TEAM_NOT_FOUND));
        List<TeamUser> teamUserList = teamUserRepository.findByTeam(team);

        List<UserInfoDto> result = new ArrayList<>();

        MattermostClient client = Client.getClient();
        client.setAccessToken(mmSessionToken);
        CountDownLatch latch = new CountDownLatch(teamUserList.size());
        for (TeamUser teamUser : teamUserList) {
            ListenableFuture<UserInfoDto> userResponse = asyncService.getNickname(client, UserInfoDto.of(teamUser.getUser()), latch);
            userResponse.addCallback(u -> {
                if (u != null && u.getNickname() != null && !u.getNickname().equals(""))
                    result.add(u);
            }, ex -> {
                log.error("ex message : " + ex.getMessage());
            });
        }
        latch.await();
        return result;
    }
}
