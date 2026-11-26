package com.webter.domain.webservice.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import java.net.InetAddress;
import org.junit.jupiter.api.Test;

class PublicDnsResolverTests {
	@Test
	void rejectsPrivateMetadataSharedAndTransitionAddresses() throws Exception {
		for (String address : java.util.List.of("0.0.0.0", "10.0.0.1", "127.0.0.1", "169.254.169.254", "172.16.0.1", "192.168.0.1",
				"100.64.0.1", "198.18.0.1", "224.0.0.1", "255.255.255.255", "::1", "fc00::1", "fe80::1", "64:ff9b::a00:1", "2002:0a00:0001::1", "2001::1"))
			assertThat(PublicDnsResolver.isPublic(InetAddress.getByName(address))).as(address).isFalse();
		assertThat(PublicDnsResolver.isPublic(InetAddress.getByName("8.8.8.8"))).isTrue();
		assertThat(PublicDnsResolver.isPublic(InetAddress.getByName("2606:4700:4700::1111"))).isTrue();
	}

	@Test
	void rejectsBenchmarkingAndDocumentationIpv6ButKeepsNeighbouringPublicRanges() throws Exception {
		for (String address : java.util.List.of("2001:2::1", "2001:2:0:ffff::1", "3fff::1", "3fff:fff::1"))
			assertThat(PublicDnsResolver.isPublic(InetAddress.getByName(address))).as(address).isFalse();
		for (String address : java.util.List.of("2001:2:1::1", "2001:3::1", "3fff:1000::1", "3ffe::1"))
			assertThat(PublicDnsResolver.isPublic(InetAddress.getByName(address))).as(address).isTrue();
	}

	@Test
	void rejectsNonHttpsUserInfoAndAlternativePortsBeforeConnecting() {
		for (String url : java.util.List.of("http://example.com", "https://user@example.com", "https://example.com:8443", "https://example.com:/"))
			assertThatThrownBy(() -> ServiceUrlPolicy.validateServiceUrl(url)).isInstanceOf(com.webter.global.exception.BusinessException.class);
	}
}
