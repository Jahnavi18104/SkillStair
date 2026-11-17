package com.skillstair;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Date;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class JwtUtil {
    private final Key key;
    public JwtUtil(@Value("${skillstair.jwt.secret}") String secret) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }
    public String create(long userId) {
        return Jwts.builder().setSubject(String.valueOf(userId)).setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + 86_400_000L))
                .signWith(key, SignatureAlgorithm.HS256).compact();
    }
    public Long parse(String token) {
        try {
            return Long.valueOf(Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token).getBody().getSubject());
        } catch (Exception e) { return null; }
    }
}
