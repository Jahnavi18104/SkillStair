package com.skillstair;

import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.simple.SimpleJdbcInsert;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final JdbcTemplate jdbc;
    private final PasswordEncoder enc;
    private final JwtUtil jwt;

    public AuthController(JdbcTemplate jdbc, PasswordEncoder enc, JwtUtil jwt) { this.jdbc = jdbc; this.enc = enc; this.jwt = jwt; }

    @PostMapping("/signup")
    public Map<String, Object> signup(@RequestBody Map<String, String> b) {
        String name = b.getOrDefault("name", "").trim();
        String email = b.getOrDefault("email", "").trim().toLowerCase();
        String pw = b.getOrDefault("password", "");
        if (name.isEmpty()) throw new ApiException(400, "Please enter your full name.");
        if (!email.matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")) throw new ApiException(400, "Please enter a valid email address.");
        if (pw.length() < 8) throw new ApiException(400, "Password must be at least 8 characters.");
        if (!pw.equals(b.get("confirmPassword"))) throw new ApiException(400, "Passwords do not match.");
        Integer c = jdbc.queryForObject("SELECT COUNT(*) FROM users WHERE email=?", Integer.class, email);
        if (c != null && c > 0) throw new ApiException(409, "An account with this email already exists.");
        long id = new SimpleJdbcInsert(jdbc).withTableName("users").usingGeneratedKeyColumns("id")
                .executeAndReturnKey(Map.of("name", name, "email", email, "password_hash", enc.encode(pw))).longValue();
        return Map.of("token", jwt.create(id), "user", Map.of("id", id, "name", name, "email", email));
    }

    @PostMapping("/login")
    public Map<String, Object> login(@RequestBody Map<String, String> b) {
        String email = b.getOrDefault("email", "").trim().toLowerCase();
        List<Map<String, Object>> rows = jdbc.queryForList("SELECT id,name,email,password_hash FROM users WHERE email=?", email);
        if (rows.isEmpty() || !enc.matches(b.getOrDefault("password", ""), (String) rows.get(0).get("password_hash")))
            throw new ApiException(401, "Invalid email or password.");
        Map<String, Object> u = rows.get(0);
        long id = ((Number) u.get("id")).longValue();
        return Map.of("token", jwt.create(id), "user", Map.of("id", id, "name", u.get("name"), "email", u.get("email")));
    }
}
