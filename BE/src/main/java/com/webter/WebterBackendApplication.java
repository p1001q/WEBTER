package com.webter;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@org.springframework.scheduling.annotation.EnableScheduling
public class WebterBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(WebterBackendApplication.class, args);
	}

}
