package com.meetup.backend.service.user;

import java.util.*;

import javax.crypto.Cipher;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import javax.persistence.LockModeType;

import com.meetup.backend.dto.channel.ChannelCreateRequestDto;
import com.meetup.backend.dto.token.TokenDto;
import com.meetup.backend.dto.user.LoginRequestDto;
import com.meetup.backend.dto.user.LoginResponseDto;
import com.meetup.backend.dto.user.UserWebexInfoDto;
import com.meetup.backend.entity.channel.Channel;
import com.meetup.backend.entity.channel.ChannelType;
import com.meetup.backend.entity.channel.ChannelUser;
import com.meetup.backend.entity.team.Team;
import com.meetup.backend.entity.user.User;
import com.meetup.backend.exception.ApiException;
import com.meetup.backend.jwt.JwtTokenProvider;
import com.meetup.backend.repository.channel.ChannelRepository;
import com.meetup.backend.repository.channel.ChannelUserRepository;
import com.meetup.backend.repository.user.UserRepository;
import com.meetup.backend.service.Client;
import com.meetup.backend.service.channel.ChannelService;
import com.meetup.backend.service.channel.ChannelUserService;
import com.meetup.backend.service.notice.WebhookNoticeService;
import com.meetup.backend.service.team.TeamService;
import com.meetup.backend.service.team.TeamUserService;
import com.meetup.backend.util.converter.JsonConverter;
import com.meetup.backend.util.exception.MattermostEx;
import jakarta.ws.rs.core.Response;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.bis5.mattermost.client4.MattermostClient;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.http.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.io.BufferedInputStream;

import static com.meetup.backend.entity.user.RoleType.*;
import static com.meetup.backend.exception.ExceptionEnum.*;

/**
 * created by seongmin on 2022/10/23
 * updated by seongmin on 2022/11/14
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
@Slf4j
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final AuthenticationManagerBuilder authenticationManagerBuilder;
    private final PasswordEncoder passwordEncoder;
    private final TeamService teamService;
    private final ChannelService channelService;
    private final TeamUserService teamUserService;
    private final ChannelUserService channelUserService;
    private final WebhookNoticeService webhookNoticeService;

    @Value("${crypto.secret}")
    private String secretKey;

    @Value("${crypto.iv}")
    private String iv;

    @Transactional(isolation = Isolation.SERIALIZABLE)
    private synchronized LoginResponseDto syncLogin(LoginRequestDto requestDto) {
        decodePassword(requestDto);
        MmLoginInfo mmLoginInfo = mmLogin(requestDto);

        User user;
        if (userRepository.findById(mmLoginInfo.getId()).isEmpty()) {
            user = userRepository.save(
                    User.builder()
                            .id(mmLoginInfo.getId())
                            .role(ROLE_Student)
                            .nickname(mmLoginInfo.getNickname())
                            .password(passwordEncoder.encode(requestDto.getPassword()))
                            .firstLogin(false)
                            .build());
        } else {
            user = userRepository.findById(mmLoginInfo.getId()).get();
            if (!mmLoginInfo.getNickname().equals(user.getNickname())) {
                user.setNickname(mmLoginInfo.getNickname());
            }
            String encodedPwd = passwordEncoder.encode(requestDto.getPassword());
            if (!passwordEncoder.matches(requestDto.getPassword(), user.getPassword())) {
                log.info("패스워드 변경");
                user.changePwd(encodedPwd);
            }
        }

        firstLoginNotice(mmLoginInfo.getMmToken(), mmLoginInfo.getNickname(), user);

        UsernamePasswordAuthenticationToken authenticationToken = new UsernamePasswordAuthenticationToken(mmLoginInfo.getId(), requestDto.getPassword());

        Authentication authentication = authenticationManagerBuilder.getObject().authenticate(authenticationToken);

        TokenDto tokenDto = jwtTokenProvider.generateJwtToken(authentication, mmLoginInfo.getMmToken());

        return LoginResponseDto.of(user, tokenDto);
    }

    @Override
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public LoginResponseDto login(LoginRequestDto requestDto) {
        return syncLogin(requestDto);
    }

    private MmLoginInfo mmLogin(LoginRequestDto requestDto) {
        String url = "https://meeting.ssafy.com/api/v4/users/login";
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> map = new HashMap<>();
        map.put("login_id", requestDto.getId());
        map.put("password", requestDto.getPassword());

        RestTemplate restTemplate = new RestTemplate();
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(map, headers);

        ResponseEntity<Map> res = restTemplate.postForEntity(url, entity, Map.class);

        Map body = res.getBody();
        switch (res.getStatusCodeValue()) {
            case 200:
                if (body == null) {
                    throw new ApiException(MATTERMOST_EXCEPTION);
                }
                String id = (String) body.get("id");
                String mmToken = Objects.requireNonNull(res.getHeaders().get("Token")).get(0);
                String nickname = (String) body.get("nickname");
                return new MmLoginInfo(id, mmToken, nickname);
            case 401:
                throw new ApiException(EMPTY_CREDENTIAL);
            default:
                throw new ApiException(MATTERMOST_EXCEPTION);
        }
    }

    private void decodePassword(LoginRequestDto requestDto) {
        try {
            Cipher cipher = Cipher.getInstance("AES/CBC/PKCS5Padding");
            cipher.init(Cipher.DECRYPT_MODE,
                    new SecretKeySpec(secretKey.getBytes(), "AES"),
                    new IvParameterSpec(iv.getBytes()));

            String originPwd = new String(cipher.doFinal(Base64.getDecoder().decode(requestDto.getPassword().getBytes("UTF-8"))));
            requestDto.setPassword(originPwd);
        } catch (Exception e) {
            e.printStackTrace();
            log.error(e.getMessage());
            throw new ApiException(PASSWORD_DECRYPTION_ERROR);
        }
    }

    private void firstLoginNotice(String mmToken, String nickname, User user) {
        if (!user.isFirstLogin()) {
            if (nickname.contains("컨설턴트") || nickname.contains("consultant")) {
                user.changeRole(ROLE_Consultant);
            } else if (nickname.contains("교수")) {
                user.changeRole(ROLE_Professor);
            } else if (nickname.contains("코치")) {
                user.changeRole(ROLE_Coach);
            } else if (nickname.contains("프로")) {
                user.changeRole(ROLE_Pro);
            }
            webhookNoticeService.firstLoginNotice(nickname);
            user.setFirstLogin();
            registerTeamAndChannel(mmToken, user.getId());
        }
    }

    @Override
    public void logout(String mmSessionToken) {
        MattermostClient client = Client.getClient();
        client.setAccessToken(mmSessionToken);
        int status = client.logout().getRawResponse().getStatus();
        MattermostEx.apiException(status);
    }

    @Override
    public String getNickname(String userId, String mmSessionToken) {
        User user = userRepository.findById(userId).orElseThrow(() -> new ApiException(USER_NOT_FOUND));
        if (user.getNickname() != null) {
            return user.getNickname();
        } else {
            MattermostClient client = Client.getClient();
            client.setAccessToken(mmSessionToken);
            Response response = client.getUser(userId).getRawResponse();
            try {
                JSONObject userObj = JsonConverter.toJson((BufferedInputStream) response.getEntity());
                return userObj.getString("nickname");
            } catch (ClassCastException e) {
                log.error(e.getMessage());
                log.info("response.getEntity() = {}", response.getEntity());
                e.printStackTrace();
                return "";
            }
        }
    }

    @Override
    @Transactional
    public void registerTeamAndChannel(String mmToken, String userId) {
        syncRegisterTeamAndChannel(mmToken, userId);
    }

    @Transactional
    private synchronized void syncRegisterTeamAndChannel(String mmToken, String userId) {
        List<Team> teams = teamService.registerTeamFromMattermost(userId, mmToken); // 팀 등록
        teamUserService.registerTeamUserFromMattermost(mmToken, teams);
        List<Channel> channels = channelService.registerChannelFromMattermost(userId, mmToken, teams);
        channelUserService.registerChannelUserFromMattermost(mmToken, channels);
    }

    @Override
    @Transactional
    public void changeWebexUrl(String userId, String webexUrl) {
        User user = userRepository.findById(userId).orElseThrow(() -> new ApiException(USER_NOT_FOUND));
        user.setWebex(webexUrl);
    }

    @Override
    public UserWebexInfoDto getWebexUrl(String userId) {
        User user = userRepository.findById(userId).orElseThrow(() -> new ApiException(USER_NOT_FOUND));
        return UserWebexInfoDto.of(userRepository.findById(user.getId()).get().getWebex());
    }

    @AllArgsConstructor
    @Getter
    private static class MmLoginInfo {
        private String id, mmToken, nickname;
    }
}
