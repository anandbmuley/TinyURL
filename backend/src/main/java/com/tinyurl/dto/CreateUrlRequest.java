package com.tinyurl.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateUrlRequest {

    @NotBlank(message = "Original URL cannot be blank")
    @Size(max = 2048, message = "URL length cannot exceed 2048 characters")
    @Pattern(
        regexp = "^(https?|ftp)://[^\\s/$.?#].[^\\s]*$",
        flags = Pattern.Flag.CASE_INSENSITIVE,
        message = "URL must be a valid HTTP, HTTPS, or FTP address"
    )
    private String url;

    @Pattern(
        regexp = "^$|^[a-zA-Z0-9_-]{3,20}$",
        message = "Custom alias must be between 3 and 20 alphanumeric characters, dashes, or underscores"
    )
    private String customAlias;
}
