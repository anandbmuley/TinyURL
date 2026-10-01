package com.tinyurl.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class ShortCodeGeneratorTest {

    private ShortCodeGenerator generator;

    @BeforeEach
    void setUp() {
        generator = new ShortCodeGenerator();
    }

    @Test
    void testGenerateCodeLengthAndFormat() {
        for (int i = 0; i < 50; i++) {
            String code = generator.generate();
            assertNotNull(code);
            assertEquals(7, code.length());
            assertTrue(code.matches("^[0-9a-zA-Z]{7}$"), "Generated code must be alphanumeric 7 chars: " + code);
        }
    }
}
