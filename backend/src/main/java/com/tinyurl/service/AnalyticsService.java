package com.tinyurl.service;

import com.tinyurl.repository.UrlRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Slf4j
@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private final UrlRepository urlRepository;

    @Async
    public void recordClickAsync(String shortCode) {
        try {
            urlRepository.incrementClickCount(shortCode, Instant.now());
            log.debug("Asynchronously recorded click for shortCode: {}", shortCode);
        } catch (Exception e) {
            log.error("Failed to record click for shortCode {}: {}", shortCode, e.getMessage());
        }
    }
}
