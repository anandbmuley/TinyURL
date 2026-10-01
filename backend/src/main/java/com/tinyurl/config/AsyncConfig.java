package com.tinyurl.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.AsyncConfigurer;
import org.springframework.scheduling.annotation.EnableAsync;

@Configuration
@EnableAsync
public class AsyncConfig implements AsyncConfigurer {
    // Uses Spring Boot 3.3's auto-configured virtual-threads-enabled task executor when enabled in application.yml
}
