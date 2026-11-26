package com.webter.domain.webservice.service;

import java.net.InetAddress;
import java.net.UnknownHostException;
import org.apache.hc.client5.http.DnsResolver;

/** 접속에 실제 사용되는 DNS 결과를 검증한다. 검증 후 별도 DNS 재조회는 하지 않는다. */
final class PublicDnsResolver implements DnsResolver {

	@Override
	public InetAddress[] resolve(String host) throws UnknownHostException {
		InetAddress[] addresses = InetAddress.getAllByName(host);
		if (addresses.length == 0) throw new UnknownHostException("Empty DNS result");
		for (InetAddress address : addresses) {
			if (!isPublic(address)) throw new UnknownHostException("Non-public address");
		}
		return addresses;
	}

	@Override
	public String resolveCanonicalHostname(String host) { return host; }

	static boolean isPublic(InetAddress address) {
		if (address.isAnyLocalAddress() || address.isLoopbackAddress() || address.isLinkLocalAddress()
				|| address.isSiteLocalAddress() || address.isMulticastAddress()) return false;
		byte[] b = address.getAddress();
		int first = Byte.toUnsignedInt(b[0]);
		int second = Byte.toUnsignedInt(b[1]);
		if (b.length == 4) {
			int third = Byte.toUnsignedInt(b[2]);
			return first != 0 && first < 224
				&& !(first == 100 && second >= 64 && second <= 127)
				&& !(first == 192 && second == 0 && (third == 0 || third == 2))
				&& !(first == 198 && (second == 18 || second == 19 || (second == 51 && third == 100)))
				&& !(first == 203 && second == 0 && third == 113);
		}
		int third = Byte.toUnsignedInt(b[2]);
		// 2001:2::/48(벤치마크)과 3fff::/20(문서용)은 전역 단일 주소 범위 안에 있지만 공개 목적지가 아니다.
		if (first == 0x20 && second == 0x01 && third == 0 && Byte.toUnsignedInt(b[3]) == 0x02 && b[4] == 0 && b[5] == 0) return false;
		if (first == 0x3F && second == 0xFF && (third & 0xF0) == 0) return false;
		return (first & 0xE0) == 0x20 && !(first == 0x20 && second == 0x02)
			&& !(first == 0x20 && second == 0x01 && b[2] == 0 && b[3] == 0)
			&& !(first == 0x20 && second == 0x01 && Byte.toUnsignedInt(b[2]) == 0x0D
				&& Byte.toUnsignedInt(b[3]) == 0xB8);
	}
}
