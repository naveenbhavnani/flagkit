# FlagKit API Testing Guide

## Authentication Endpoints

### Base URL
```
http://localhost:3001
```

### 1. Register a New User

**Endpoint:** `POST /api/v1/auth/register`

**Request:**
```bash
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "name": "John Doe"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "email": "user@example.com",
      "name": "John Doe",
      "emailVerified": false
    },
    "tokens": {
      "accessToken": "eyJhbGci...",
      "refreshToken": "eyJhbGci...",
      "expiresIn": 604800
    }
  }
}
```

### 2. Login

**Endpoint:** `POST /api/v1/auth/login`

**Request:**
```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "email": "user@example.com",
      "name": "John Doe",
      "emailVerified": false
    },
    "tokens": {
      "accessToken": "eyJhbGci...",
      "refreshToken": "eyJhbGci...",
      "expiresIn": 604800
    }
  }
}
```

### 3. Get Current User (Protected)

**Endpoint:** `GET /api/v1/auth/me`

**Request:**
```bash
curl http://localhost:3001/api/v1/auth/me \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "email": "user@example.com",
      "name": "John Doe",
      "avatarUrl": null,
      "emailVerified": false,
      "authProvider": "EMAIL",
      "twoFactorEnabled": false,
      "createdAt": "2025-11-08T07:40:48.336Z",
      "updatedAt": "2025-11-08T07:41:34.893Z",
      "lastLoginAt": "2025-11-08T07:41:34.892Z"
    }
  }
}
```

### 4. Refresh Token

**Endpoint:** `POST /api/v1/auth/refresh`

**Request:**
```bash
curl -X POST http://localhost:3001/api/v1/auth/refresh \
  -H 'Content-Type: application/json' \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tokens": {
      "accessToken": "eyJhbGci...",
      "refreshToken": "eyJhbGci...",
      "expiresIn": 604800
    }
  }
}
```

## Health Check Endpoints

### Basic Health
```bash
curl http://localhost:3001/health
```

### Database Health
```bash
curl http://localhost:3001/health/db
```

## Token Information

- **Access Token Expiry:** 7 days
- **Refresh Token Expiry:** 30 days
- **Token Type:** JWT (JSON Web Token)
- **Authorization Header Format:** `Bearer <token>`

## Error Responses

### Validation Error (400)
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": [...]
  }
}
```

### Authentication Error (401)
```json
{
  "success": false,
  "error": {
    "code": "AUTHENTICATION_ERROR",
    "message": "Invalid email or password"
  }
}
```

### Unauthorized (401)
```json
{
  "error": "Unauthorized"
}
```
