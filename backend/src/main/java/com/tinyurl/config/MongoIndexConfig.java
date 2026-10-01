package com.tinyurl.config;

import com.tinyurl.model.UrlMapping;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.event.EventListener;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.Index;

import java.util.concurrent.TimeUnit;

@Slf4j
@Configuration
@RequiredArgsConstructor
public class MongoIndexConfig {

    private final MongoTemplate mongoTemplate;

    @EventListener(ApplicationReadyEvent.class)
    public void initIndicesAfterStartup() {
        try {
            // Ensure unique index on shortCode
            mongoTemplate.indexOps(UrlMapping.class)
                    .ensureIndex(new Index().on("shortCode", Sort.Direction.ASC).unique());
            log.info("Ensured unique index on shortCode");

            // Ensure native MongoDB TTL index on expiresAt (expires documents when expiresAt <= current time)
            mongoTemplate.indexOps(UrlMapping.class)
                    .ensureIndex(new Index().on("expiresAt", Sort.Direction.ASC).expire(0, TimeUnit.SECONDS));
            log.info("Ensured TTL index on expiresAt (7-day retention)");
        } catch (Exception e) {
            log.warn("Notice: MongoDB index initialization deferred or skipped: {}", e.getMessage());
        }
    }
}
