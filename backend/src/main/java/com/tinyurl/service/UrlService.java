package com.tinyurl.service;

import com.tinyurl.dto.AnalyticsResponse;
import com.tinyurl.dto.CreateUrlRequest;
import com.tinyurl.dto.UrlResponse;
import com.tinyurl.exception.AliasAlreadyExistsException;
import com.tinyurl.exception.UrlExpiredException;
import com.tinyurl.exception.UrlNotFoundException;
import com.tinyurl.model.UrlMapping;
import com.tinyurl.repository.UrlRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class UrlService {

    private final UrlRepository urlRepository;
    private final ShortCodeGenerator shortCodeGenerator;
    private final AnalyticsService analyticsService;

    @Value("${app.base-url:http://localhost:8081/}")
    private String baseUrl;

    @Value("${app.default-ttl-days:7}")
    private int defaultTtlDays;

    public UrlResponse createShortUrl(CreateUrlRequest request) {
        String shortCode;
        boolean isCustom = false;

        if (request.getCustomAlias() != null && !request.getCustomAlias().trim().isEmpty()) {
            shortCode = request.getCustomAlias().trim();
            isCustom = true;
            if (urlRepository.existsByShortCode(shortCode)) {
                throw new AliasAlreadyExistsException("Alias '" + shortCode + "' is already in use. Please choose another.");
            }
        } else {
            shortCode = generateUniqueShortCode();
        }

        Instant now = Instant.now();
        Instant expiresAt = now.plus(defaultTtlDays, ChronoUnit.DAYS);

        UrlMapping urlMapping = UrlMapping.builder()
                .shortCode(shortCode)
                .originalUrl(request.getUrl().trim())
                .customAlias(isCustom)
                .createdAt(now)
                .expiresAt(expiresAt)
                .clickCount(0L)
                .build();

        UrlMapping saved = urlRepository.save(urlMapping);
        log.info("Created short URL: code={}, originalUrl={}, expiresAt={}", shortCode, saved.getOriginalUrl(), expiresAt);

        return toResponse(saved);
    }

    public String resolveShortUrl(String shortCode) {
        UrlMapping mapping = urlRepository.findByShortCode(shortCode)
                .orElseThrow(() -> new UrlNotFoundException("Short URL '" + shortCode + "' not found"));

        if (mapping.getExpiresAt() != null && mapping.getExpiresAt().isBefore(Instant.now())) {
            log.warn("Attempted access to expired short URL: {}", shortCode);
            throw new UrlExpiredException("Short URL '" + shortCode + "' has expired and is no longer valid");
        }

        // Asynchronously record click
        analyticsService.recordClickAsync(shortCode);

        return mapping.getOriginalUrl();
    }

    public UrlResponse getUrlDetails(String shortCode) {
        UrlMapping mapping = urlRepository.findByShortCode(shortCode)
                .orElseThrow(() -> new UrlNotFoundException("Short URL '" + shortCode + "' not found"));

        if (mapping.getExpiresAt() != null && mapping.getExpiresAt().isBefore(Instant.now())) {
            throw new UrlExpiredException("Short URL '" + shortCode + "' has expired");
        }

        return toResponse(mapping);
    }

    public AnalyticsResponse getAnalytics(String shortCode) {
        UrlMapping mapping = urlRepository.findByShortCode(shortCode)
                .orElseThrow(() -> new UrlNotFoundException("Short URL '" + shortCode + "' not found"));

        Instant now = Instant.now();
        boolean expired = mapping.getExpiresAt() != null && mapping.getExpiresAt().isBefore(now);
        long remainingSeconds = expired ? 0 : Duration.between(now, mapping.getExpiresAt()).toSeconds();

        return AnalyticsResponse.builder()
                .shortCode(mapping.getShortCode())
                .shortUrl(formatFullUrl(mapping.getShortCode()))
                .originalUrl(mapping.getOriginalUrl())
                .customAlias(mapping.isCustomAlias())
                .createdAt(mapping.getCreatedAt())
                .expiresAt(mapping.getExpiresAt())
                .clickCount(mapping.getClickCount())
                .lastAccessedAt(mapping.getLastAccessedAt())
                .remainingSeconds(remainingSeconds)
                .expired(expired)
                .build();
    }

    private String generateUniqueShortCode() {
        int maxAttempts = 5;
        for (int i = 0; i < maxAttempts; i++) {
            String code = shortCodeGenerator.generate();
            if (!urlRepository.existsByShortCode(code)) {
                return code;
            }
        }
        throw new RuntimeException("Failed to generate a unique short code after " + maxAttempts + " attempts. Please retry.");
    }

    private UrlResponse toResponse(UrlMapping mapping) {
        return UrlResponse.builder()
                .shortCode(mapping.getShortCode())
                .shortUrl(formatFullUrl(mapping.getShortCode()))
                .originalUrl(mapping.getOriginalUrl())
                .customAlias(mapping.isCustomAlias())
                .createdAt(mapping.getCreatedAt())
                .expiresAt(mapping.getExpiresAt())
                .clickCount(mapping.getClickCount())
                .build();
    }

    private String formatFullUrl(String shortCode) {
        String base = baseUrl.endsWith("/") ? baseUrl : baseUrl + "/";
        return base + shortCode;
    }
}
