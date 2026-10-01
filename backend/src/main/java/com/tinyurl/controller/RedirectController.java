package com.tinyurl.controller;

import com.tinyurl.service.UrlService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.Set;

@Slf4j
@RestController
@RequiredArgsConstructor
public class RedirectController {

    private final UrlService urlService;

    private static final Set<String> RESERVED_KEYWORDS = Set.of(
            "api", "actuator", "error", "favicon.ico", "swagger-ui", "v3", "health"
    );

    @GetMapping("/{shortCode:[a-zA-Z0-9_-]+}")
    public ResponseEntity<Void> redirectToOriginalUrl(@PathVariable String shortCode) {
        if (RESERVED_KEYWORDS.contains(shortCode.toLowerCase())) {
            return ResponseEntity.notFound().build();
        }

        String targetUrl = urlService.resolveShortUrl(shortCode);
        log.debug("Redirecting shortCode '{}' to '{}'", shortCode, targetUrl);

        HttpHeaders headers = new HttpHeaders();
        headers.setLocation(URI.create(targetUrl));
        // HTTP 302 Found (Temporary Redirect) prevents browsers from permanently caching the redirect
        // so analytics and 7-day TTL expiration are accurately enforced.
        return new ResponseEntity<>(headers, HttpStatus.FOUND);
    }
}
