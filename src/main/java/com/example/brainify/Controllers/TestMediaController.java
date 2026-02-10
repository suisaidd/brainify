package com.example.brainify.Controllers;

import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@RestController
@RequestMapping("/tests/media")
public class TestMediaController {

    private static final Path TEST_IMAGE_DIR = Paths.get("uploads", "tests");

    @GetMapping("/{filename:.+}")
    public ResponseEntity<Resource> serveTestImage(@PathVariable String filename) throws IOException {
        Path filePath = TEST_IMAGE_DIR.resolve(filename);
        if (!Files.exists(filePath)) {
            return ResponseEntity.notFound().build();
        }

        FileSystemResource resource = new FileSystemResource(filePath);
        String contentType = Files.probeContentType(filePath);
        if (contentType == null) {
            contentType = MediaType.APPLICATION_OCTET_STREAM_VALUE;
        }

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .body(resource);
    }
}

