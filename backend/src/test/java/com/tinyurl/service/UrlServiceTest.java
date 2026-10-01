package com.tinyurl.service;

import com.tinyurl.dto.AnalyticsResponse;
import com.tinyurl.dto.CreateUrlRequest;
import com.tinyurl.dto.UrlResponse;
import com.tinyurl.exception.AliasAlreadyExistsException;
import com.tinyurl.exception.UrlExpiredException;
import com.tinyurl.exception.UrlNotFoundException;
import com.tinyurl.model.UrlMapping;
import com.tinyurl.repository.UrlRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UrlServiceTest {

    @Mock
    private UrlRepository urlRepository;

    @Mock
    private ShortCodeGenerator shortCodeGenerator;

    @Mock
    private AnalyticsService analyticsService;

    @InjectMocks
    private UrlService urlService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(urlService, "baseUrl", "http://localhost:8081/");
        ReflectionTestUtils.setField(urlService, "defaultTtlDays", 7);
    }

    @Test
    void testCreateShortUrlWithGeneratedCode() {
        when(shortCodeGenerator.generate()).thenReturn("abc1234");
        when(urlRepository.existsByShortCode("abc1234")).thenReturn(false);
        when(urlRepository.save(any(UrlMapping.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CreateUrlRequest request = CreateUrlRequest.builder()
                .url("https://example.com/long/url")
                .build();

        UrlResponse response = urlService.createShortUrl(request);

        assertNotNull(response);
        assertEquals("abc1234", response.getShortCode());
        assertEquals("http://localhost:8081/abc1234", response.getShortUrl());
        assertEquals("https://example.com/long/url", response.getOriginalUrl());
        assertFalse(response.isCustomAlias());
        assertNotNull(response.getExpiresAt());
        verify(urlRepository, times(1)).save(any(UrlMapping.class));
    }

    @Test
    void testCreateShortUrlWithCustomAlias() {
        when(urlRepository.existsByShortCode("my-custom-link")).thenReturn(false);
        when(urlRepository.save(any(UrlMapping.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CreateUrlRequest request = CreateUrlRequest.builder()
                .url("https://example.com/awesome")
                .customAlias("my-custom-link")
                .build();

        UrlResponse response = urlService.createShortUrl(request);

        assertNotNull(response);
        assertEquals("my-custom-link", response.getShortCode());
        assertTrue(response.isCustomAlias());
    }

    @Test
    void testCreateShortUrlDuplicateAliasThrowsException() {
        when(urlRepository.existsByShortCode("existing-alias")).thenReturn(true);

        CreateUrlRequest request = CreateUrlRequest.builder()
                .url("https://example.com/foo")
                .customAlias("existing-alias")
                .build();

        assertThrows(AliasAlreadyExistsException.class, () -> urlService.createShortUrl(request));
    }

    @Test
    void testResolveShortUrlSuccess() {
        UrlMapping mapping = UrlMapping.builder()
                .shortCode("abc1234")
                .originalUrl("https://example.com")
                .createdAt(Instant.now().minus(1, ChronoUnit.DAYS))
                .expiresAt(Instant.now().plus(6, ChronoUnit.DAYS))
                .build();

        when(urlRepository.findByShortCode("abc1234")).thenReturn(Optional.of(mapping));

        String target = urlService.resolveShortUrl("abc1234");
        assertEquals("https://example.com", target);
        verify(analyticsService, times(1)).recordClickAsync("abc1234");
    }

    @Test
    void testResolveShortUrlNotFoundThrowsException() {
        when(urlRepository.findByShortCode("not-found")).thenReturn(Optional.empty());
        assertThrows(UrlNotFoundException.class, () -> urlService.resolveShortUrl("not-found"));
    }

    @Test
    void testResolveShortUrlExpiredThrowsException() {
        UrlMapping expiredMapping = UrlMapping.builder()
                .shortCode("expired1")
                .originalUrl("https://example.com")
                .createdAt(Instant.now().minus(10, ChronoUnit.DAYS))
                .expiresAt(Instant.now().minus(3, ChronoUnit.DAYS))
                .build();

        when(urlRepository.findByShortCode("expired1")).thenReturn(Optional.of(expiredMapping));
        assertThrows(UrlExpiredException.class, () -> urlService.resolveShortUrl("expired1"));
    }

    @Test
    void testGetAnalytics() {
        Instant now = Instant.now();
        Instant expires = now.plus(5, ChronoUnit.DAYS);
        UrlMapping mapping = UrlMapping.builder()
                .shortCode("stat123")
                .originalUrl("https://example.com/stats")
                .createdAt(now.minus(2, ChronoUnit.DAYS))
                .expiresAt(expires)
                .clickCount(42L)
                .lastAccessedAt(now.minus(1, ChronoUnit.HOURS))
                .build();

        when(urlRepository.findByShortCode("stat123")).thenReturn(Optional.of(mapping));

        AnalyticsResponse response = urlService.getAnalytics("stat123");
        assertNotNull(response);
        assertEquals(42L, response.getClickCount());
        assertFalse(response.isExpired());
        assertTrue(response.getRemainingSeconds() > 0);
    }
}
