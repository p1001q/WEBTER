package com.webter;

import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.security.KeyPairGenerator;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.time.Instant;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

// 실제 Google과 통신하지 않는다. JWT는 테스트마다 생성한 RSA 키로 서명한다.
class OidcTestProvider implements AutoCloseable {
    record Identity(String subject, String email, boolean verified, String nonce, String audience,
                    boolean expired, boolean badSignature) {}

    private final HttpServer server;
    private final RSAKey key;
    private final RSAKey wrongKey;
    private final Map<String, Identity> codes = new ConcurrentHashMap<>();
    private final Map<String, Identity> tokens = new ConcurrentHashMap<>();
    final AtomicInteger exchanges = new AtomicInteger();

    OidcTestProvider() throws Exception {
        key = newKey();
        wrongKey = newKey();
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/jwks", exchange -> respond(exchange, 200, new JWKSet(key.toPublicJWK()).toString()));
        server.createContext("/token", this::token);
        server.createContext("/userinfo", exchange -> {
            String header = exchange.getRequestHeaders().getFirst("Authorization");
            Identity identity = header == null ? null : tokens.get(header.replace("Bearer ", ""));
            if (identity == null) {
                respond(exchange, 401, "{}");
                return;
            }
            respond(exchange, 200, "{\"sub\":\"" + identity.subject() + "\",\"email\":\""
                    + identity.email() + "\",\"email_verified\":" + identity.verified() + "}");
        });
        server.start();
    }

    String origin() { return "http://127.0.0.1:" + server.getAddress().getPort(); }

    String code(Identity identity) {
        String code = UUID.randomUUID().toString();
        codes.put(code, identity);
        return code;
    }

    static Map<String, String> query(URI uri) {
        Map<String, String> values = new HashMap<>();
        if (uri.getRawQuery() != null) {
            for (String part : uri.getRawQuery().split("&")) {
                String[] pair = part.split("=", 2);
                values.put(URLDecoder.decode(pair[0], StandardCharsets.UTF_8),
                        pair.length > 1 ? URLDecoder.decode(pair[1], StandardCharsets.UTF_8) : "");
            }
        }
        return values;
    }

    private void token(HttpExchange exchange) throws IOException {
        exchanges.incrementAndGet();
        var form = query(URI.create("http://localhost/?" + new String(exchange.getRequestBody().readAllBytes(),
                StandardCharsets.UTF_8)));
        Identity identity = codes.remove(form.get("code"));
        if (identity == null) {
            respond(exchange, 400, "{\"error\":\"invalid_grant\"}");
            return;
        }
        try {
            Instant now = Instant.now();
            var claims = new JWTClaimsSet.Builder().issuer("https://accounts.google.com")
                    .subject(identity.subject()).audience(identity.audience())
                    .issueTime(Date.from(now.minusSeconds(5)))
                    .expirationTime(Date.from(now.plusSeconds(identity.expired() ? -600 : 300)))
                    .claim("nonce", identity.nonce()).claim("email", identity.email())
                    .claim("email_verified", identity.verified()).build();
            SignedJWT jwt = new SignedJWT(new JWSHeader.Builder(JWSAlgorithm.RS256).keyID(key.getKeyID()).build(), claims);
            jwt.sign(new RSASSASigner(identity.badSignature() ? wrongKey : key));
            String accessToken = UUID.randomUUID().toString();
            tokens.put(accessToken, identity);
            respond(exchange, 200, "{\"access_token\":\"" + accessToken
                    + "\",\"token_type\":\"Bearer\",\"expires_in\":300,\"scope\":\"openid email\",\"id_token\":\""
                    + jwt.serialize() + "\"}");
        } catch (JOSEException ex) {
            respond(exchange, 500, "{}");
        }
    }

    private static RSAKey newKey() throws Exception {
        var generator = KeyPairGenerator.getInstance("RSA");
        generator.initialize(2048);
        var pair = generator.generateKeyPair();
        return new RSAKey.Builder((RSAPublicKey) pair.getPublic()).privateKey((RSAPrivateKey) pair.getPrivate())
                .keyID(UUID.randomUUID().toString()).build();
    }

    private static void respond(HttpExchange exchange, int status, String body) throws IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json");
        exchange.sendResponseHeaders(status, bytes.length);
        exchange.getResponseBody().write(bytes);
        exchange.close();
    }

    @Override
    public void close() { server.stop(0); }
}
