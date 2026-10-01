package com.tinyurl.repository;

import java.time.Instant;

public interface CustomUrlRepository {
    void incrementClickCount(String shortCode, Instant accessTime);
}
