package com.webter.domain.stats.service;

import com.webter.domain.reaction.exception.InteractionErrorCode;
import com.webter.global.exception.BusinessException;
import com.webter.global.exception.ErrorCode;
import java.net.InetAddress;
import java.net.UnknownHostException;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.util.HexFormat;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.stereotype.Component;

@Component
public class ClientIpHmac {

	private static final String ALGORITHM = "HmacSHA256";

	private final byte[] key;

	public ClientIpHmac(Environment environment) {
		String configured = environment.getProperty("SERVICE_EVENT_IP_HMAC_KEY");
		if ((configured == null || configured.isBlank()) && environment.acceptsProfiles(Profiles.of("local", "test"))) {
			configured = "webter-local-event-ip-key";
		}
		key = configured == null || configured.isBlank() ? null : configured.getBytes(StandardCharsets.UTF_8);
	}

	public String hash(String remoteAddress) {
		var unavailable = InteractionErrorCode.EVENT_RECORDING_UNAVAILABLE;
		return digest(addressBytes(remoteAddress, unavailable), false, unavailable);
	}

	public GuestReviewAddress guestReview(String remoteAddress) {
		var unavailable = InteractionErrorCode.GUEST_REVIEW_UNAVAILABLE;
		byte[] address = addressBytes(remoteAddress, unavailable);
		String display = address.length == 4
			? Byte.toUnsignedInt(address[0]) + "." + Byte.toUnsignedInt(address[1]) : null;
		return new GuestReviewAddress(digest(address, true, unavailable), display);
	}

	private String digest(byte[] address, boolean guestReview, ErrorCode unavailable) {
		if (key == null) {
			throw new BusinessException(unavailable);
		}
		try {
			Mac mac = Mac.getInstance(ALGORITHM);
			mac.init(new SecretKeySpec(key, ALGORITHM));
			if (guestReview) {
				// 같은 IP라도 실행 이벤트와 리뷰에 동일한 비교값을 저장하지 않는다.
				mac.update("guest-review:".getBytes(StandardCharsets.US_ASCII));
			}
			return HexFormat.of().formatHex(mac.doFinal(address));
		}
		catch (GeneralSecurityException e) {
			throw new IllegalStateException("IP HMAC을 초기화할 수 없습니다.", e);
		}
	}

	private static byte[] addressBytes(String remoteAddress, ErrorCode unavailable) {
		// 운영 프록시의 전달 헤더는 신뢰 프록시를 설정한 서블릿 컨테이너에서만 처리한다.
		String literal = remoteAddress == null ? "" : remoteAddress.split("%", 2)[0];
		if (literal.matches("(?:[0-9]{1,3}\\.){3}[0-9]{1,3}")) {
			String[] octets = literal.split("\\.");
			byte[] address = new byte[4];
			for (int i = 0; i < address.length; i++) {
				int octet = Integer.parseInt(octets[i]);
				if (octet > 255) {
					throw new BusinessException(unavailable);
				}
				address[i] = (byte) octet;
			}
			return address;
		}
		if (literal.contains(":") && literal.matches("[0-9a-fA-F:.]+")) {
			try {
				return InetAddress.getByName(literal).getAddress();
			}
			catch (UnknownHostException ignored) {
				// IPv6 리터럴의 형식이 잘못되었다.
			}
		}
		throw new BusinessException(unavailable);
	}

	public record GuestReviewAddress(String hash, String display) {
	}

}
