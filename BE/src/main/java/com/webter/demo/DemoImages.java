package com.webter.demo;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import com.webter.domain.upload.config.ImageStorageProperties;

import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

/**
 * 시연 이미지(src/main/resources/demo/images)를 이미지 저장소의 고정 경로(uploads/demo/)에 올린다.
 * 같은 이름은 같은 경로에 덮어쓰므로 시드를 다시 실행해도 저장소에 이미지가 쌓이지 않는다.
 */
@Component
class DemoImages {

	static final String KEY_PREFIX = ImageStorageProperties.KEY_PREFIX + "demo/";

	private final ImageStorageProperties storage;
	private final ObjectProvider<S3Client> clients;

	DemoImages(ImageStorageProperties storage, ObjectProvider<S3Client> clients) {
		this.storage = storage;
		this.clients = clients;
	}

	record Uploaded(String key, String url, long size) {
	}

	Map<String, Uploaded> upload(Set<String> names) {
		S3Client s3 = clients.getIfAvailable();
		if (!storage.enabled() || s3 == null || storage.baseUrl().isEmpty()) {
			throw new IllegalStateException("이미지 저장소 설정(IMAGE_BUCKET·IMAGE_PUBLIC_BASE_URL)이 없어 시연 이미지를 올릴 수 없습니다.");
		}
		Map<String, Uploaded> result = new LinkedHashMap<>();
		for (String name : names) {
			byte[] bytes = read(name);
			String key = KEY_PREFIX + name + ".jpg";
			s3.putObject(PutObjectRequest.builder()
				.bucket(storage.bucket())
				.key(key)
				.contentType("image/jpeg")
				.contentDisposition("inline")
				.build(), RequestBody.fromBytes(bytes));
			result.put(name, new Uploaded(key, storage.baseUrl() + "/" + key, bytes.length));
		}
		return result;
	}

	private static byte[] read(String name) {
		var resource = new ClassPathResource("demo/images/" + name + ".jpg");
		try {
			return resource.getContentAsByteArray();
		}
		catch (IOException ex) {
			throw new UncheckedIOException("시연 이미지가 없습니다: " + name, ex);
		}
	}
}
