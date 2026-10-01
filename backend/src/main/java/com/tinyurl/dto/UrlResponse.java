package com.tinyurl.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UrlResponse {
    private String shortCode;
    private String shortUrl;
    private String originalUrl;
    private boolean customAlias;
    private Instant createdAt;
    private Instant expiresAt;
    private long clickCount;
}
