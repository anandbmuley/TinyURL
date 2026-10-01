package com.tinyurl.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class Base62EncoderTest {

    private Base62Encoder encoder;

    @BeforeEach
    void setUp() {
        encoder = new Base62Encoder();
    }

    @Test
    void testEncodeAndDecodeZero() {
        String encoded = encoder.encode(0);
        assertEquals("0", encoded);
        assertEquals(0, encoder.decode(encoded));
    }

    @Test
    void testEncodeAndDecodeArbitraryValues() {
        long[] testValues = {1, 61, 62, 125, 999999, 123456789012345L};
        for (long val : testValues) {
            String encoded = encoder.encode(val);
            assertNotNull(encoded);
            assertFalse(encoded.isEmpty());
            assertEquals(val, encoder.decode(encoded));
        }
    }

    @Test
    void testInvalidCharacterThrowsException() {
        assertThrows(IllegalArgumentException.class, () -> encoder.decode("invalid-character!"));
    }
}
