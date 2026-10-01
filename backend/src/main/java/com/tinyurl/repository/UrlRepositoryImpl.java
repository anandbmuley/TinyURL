package com.tinyurl.repository;

import com.tinyurl.model.UrlMapping;
import lombok.RequiredArgsConstructor;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Repository;

import java.time.Instant;

@Repository
@RequiredArgsConstructor
public class UrlRepositoryImpl implements CustomUrlRepository {

    private final MongoTemplate mongoTemplate;

    @Override
    public void incrementClickCount(String shortCode, Instant accessTime) {
        Query query = new Query(Criteria.where("shortCode").is(shortCode));
        Update update = new Update()
                .inc("clickCount", 1)
                .set("lastAccessedAt", accessTime);
        mongoTemplate.updateFirst(query, update, UrlMapping.class);
    }
}
