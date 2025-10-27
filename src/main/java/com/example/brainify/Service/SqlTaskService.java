package com.example.brainify.Service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class SqlTaskService {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    public List<Map<String, Object>> executeSelect(String sql) {
        String trimmed = sql == null ? "" : sql.trim().toLowerCase(Locale.ROOT);
        if (!trimmed.startsWith("select")) {
            throw new IllegalArgumentException("Разрешены только SELECT-запросы");
        }
        return jdbcTemplate.queryForList(sql);
    }
}


