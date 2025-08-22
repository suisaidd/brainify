package com.example.brainify;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class BrainifyApplication {

    public static void main(String[] args) {
        SpringApplication.run(BrainifyApplication.class, args);
    }

}
