package com.tinyurl.controller;

import com.tinyurl.exception.GlobalExceptionHandler;
import com.tinyurl.exception.UrlExpiredException;
import com.tinyurl.exception.UrlNotFoundException;
import com.tinyurl.service.UrlService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class RedirectControllerTest {

    private MockMvc mockMvc;

    @Mock
    private UrlService urlService;

    @InjectMocks
    private RedirectController redirectController;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(redirectController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void testRedirectReturns302WithLocationHeader() throws Exception {
        when(urlService.resolveShortUrl("test1234")).thenReturn("https://google.com");

        mockMvc.perform(get("/test1234"))
                .andExpect(status().isFound())
                .andExpect(header().string("Location", "https://google.com"));
    }

    @Test
    void testRedirectNotFoundReturns404() throws Exception {
        when(urlService.resolveShortUrl("notfound")).thenThrow(new UrlNotFoundException("Short URL not found"));

        mockMvc.perform(get("/notfound"))
                .andExpect(status().isNotFound());
    }

    @Test
    void testRedirectExpiredReturns410() throws Exception {
        when(urlService.resolveShortUrl("expired1")).thenThrow(new UrlExpiredException("Short URL expired"));

        mockMvc.perform(get("/expired1"))
                .andExpect(status().isGone());
    }
}
