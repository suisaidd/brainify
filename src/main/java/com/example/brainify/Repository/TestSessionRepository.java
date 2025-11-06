package com.example.brainify.Repository;

import com.example.brainify.Model.TestSession;
import com.example.brainify.Model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TestSessionRepository extends JpaRepository<TestSession, Long> {
    List<TestSession> findByUserOrderByCreatedAtDesc(User user);
    List<TestSession> findByUserAndIsCompletedTrueOrderByCompletedAtDesc(User user);
    List<TestSession> findByIsCompletedTrueOrderByCompletedAtDesc();
}


