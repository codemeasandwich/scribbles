# Tracing

Distributed tracing and correlation functionality.

## Directory Structure

```
tracing/
├── hijacker.js
├── middleware.js
├── namespace.js
└── trace.js
```

## Files

### `hijacker.js`
HTTP/HTTPS request hijacker for automatic trace header injection.

### `middleware.js`
Express middleware for distributed tracing and trace context propagation.

### `namespace.js`
CLS (Continuation-Local Storage) namespace management for trace correlation.

### `trace.js`
Distributed tracing functions for creating trace contexts and W3C headers.
