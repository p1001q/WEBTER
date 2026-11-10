package com.webter.domain.upload.config;

import java.net.URI;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.AwsCredentialsProvider;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

/** S3 클라이언트(서버가 객체를 확인할 때)와 미리 서명하는 도구(브라우저가 올릴 주소를 만들 때). bucket이 있을 때만 만든다. */
@Configuration
@EnableConfigurationProperties(ImageStorageProperties.class)
class ImageStorageConfig {

	private static final String ENABLED = "!'${app.image.bucket:}'.isBlank()";

	@Bean(destroyMethod = "close")
	@ConditionalOnExpression(ENABLED)
	S3Client imageS3Client(ImageStorageProperties p) {
		var builder = S3Client.builder()
			.region(Region.of(p.region()))
			.credentialsProvider(credentials(p))
			.serviceConfiguration(S3Configuration.builder().pathStyleAccessEnabled(hasText(p.endpoint())).build());
		if (hasText(p.endpoint())) {
			builder.endpointOverride(URI.create(p.endpoint()));
		}
		return builder.build();
	}

	// 브라우저가 접속하는 주소로 서명해야 하므로 서버가 쓰는 주소와 다를 수 있다(로컬 컨테이너 등)
	@Bean(destroyMethod = "close")
	@ConditionalOnExpression(ENABLED)
	S3Presigner imageS3Presigner(ImageStorageProperties p) {
		var builder = S3Presigner.builder()
			.region(Region.of(p.region()))
			.credentialsProvider(credentials(p))
			.serviceConfiguration(S3Configuration.builder().pathStyleAccessEnabled(hasText(p.endpoint())).build());
		String endpoint = hasText(p.publicEndpoint()) ? p.publicEndpoint() : p.endpoint();
		if (hasText(endpoint)) {
			builder.endpointOverride(URI.create(endpoint));
		}
		return builder.build();
	}

	private static AwsCredentialsProvider credentials(ImageStorageProperties p) {
		return hasText(p.accessKey()) && hasText(p.secretKey())
				? StaticCredentialsProvider.create(AwsBasicCredentials.create(p.accessKey(), p.secretKey()))
				: DefaultCredentialsProvider.builder().build();
	}

	private static boolean hasText(String value) {
		return value != null && !value.isBlank();
	}

}
