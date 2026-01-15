/**
 * Scribbles - A log and tracing lib for Node
 * TypeScript definitions
 */

// =============================================================================
// Configuration Types
// =============================================================================

/**
 * Pretty printing options for value serialization
 */
interface PrettyOptions {
    /** Preferred indentation string (default: "  ") */
    indent?: string;
    /** Will inline values up to this length (default: terminal width in dev, Infinity in prod) */
    inlineCharacterLimit?: number;
    /** Set to true to get single-quoted strings (default: false) */
    singleQuotes?: boolean;
    /** How many nested steps in the object/array tree to walk */
    depth?: number;
    /** Filter function to include/exclude properties */
    filter?: (obj: object, key: string) => boolean;
    /** Transform function to modify stringified property values */
    transform?: (obj: object, key: string, value: string) => string;
}

/**
 * Git environment variable mapping
 */
interface GitEnvConfig {
    /** Environment variable name for git short hash */
    hash?: string;
    /** Environment variable name for git repository name */
    repo?: string;
    /** Environment variable name for git branch */
    branch?: string;
}

/**
 * StdOut configuration - can be a function, object with level methods, or null to disable
 */
type StdOutConfig =
    | ((msg: string) => void)
    | { [level: string]: (msg: string) => void }
    | { log: (msg: string) => void }
    | null;

/**
 * Configuration options for scribbles
 */
interface ScribblesConfig {
    /** Environment mode (default: process.env.NODE_ENV || 'dev') */
    mode?: string;
    /** Log format template string with placeholders */
    format?: string;
    /** Time format using Moment.js format tokens (default: "YYYY-MM-DDTHH:mm:ss.SSS") */
    time?: string;
    /** Array of log levels from highest to lowest priority */
    levels?: string[];
    /** Minimum log level to output (default: "debug") */
    logLevel?: string;
    /** Log level that triggers trace flushing */
    traceTrigger?: string;
    /** Output destination for formatted log strings */
    stdOut?: StdOutConfig;
    /** Callback to receive structured log data objects */
    dataOut?: (data: LogEntry) => void;
    /** Custom stringify function for values */
    stringify?: (value: unknown, pretty: PrettyOptions) => string;
    /** Headers to forward in trace context (string, RegExp, array, or null to disable) */
    headers?: string | RegExp | (string | RegExp)[] | null;
    /** Header name mapping from input to output */
    headersMapping?: { [outputKey: string]: string | string[] };
    /** Environment variable mapping for git info */
    gitEnv?: GitEnvConfig;
    /** Pretty printing options */
    pretty?: PrettyOptions;
}

// =============================================================================
// Log Entry Types
// =============================================================================

/**
 * Git information in log entry
 */
interface GitInfo {
    repo: string;
    branch: string;
    hash: string;
}

/**
 * Trace context information
 */
interface TraceInfo {
    traceId?: string;
    spanId?: string;
    span64?: string;
    spanLabel?: string;
    tracestate?: Array<{ key: string; value: string }>;
}

/**
 * Log entry metadata
 */
interface LogInfo {
    time: Date;
    mode: string;
    hostname: string;
    instance: string;
    logLevel: string;
}

/**
 * Source context information
 */
interface ContextInfo {
    fileName: string;
    lineNumber: number;
}

/**
 * Log input data
 */
interface InputInfo {
    message?: string;
    originalMessage?: string;
    value?: unknown;
    stackTrace?: string[];
}

/**
 * CPU status information
 */
interface CpuStatus {
    cores: number;
    model: string;
    speed: number;
    percUsed: number;
    percFree: number;
}

/**
 * System status information
 */
interface SysStatus {
    startedAt: Date;
    arch: string;
    platform: string;
    totalMem: number;
    freeMem: number;
    usedMem: number;
}

/**
 * Process status information
 */
interface ProcessStatus {
    percUsedCpu: number;
    percFreeMem: number;
    usedMem: number;
    startedAt: Date;
    pTitle?: string;
    pid?: number;
    ppid?: number;
    user?: string;
    vNode?: string;
}

/**
 * Network status information
 */
interface NetworkStatus {
    port: number | null;
    connections: number;
}

/**
 * Full status information returned by scribbles.status()
 */
interface StatusInfo {
    state: 'up' | 'blocking';
    cpu: CpuStatus;
    sys: SysStatus;
    process: ProcessStatus;
    network: NetworkStatus;
}

/**
 * Structured log entry object passed to dataOut callback
 */
interface LogEntry {
    /** Scribbles version */
    v: string;
    /** Git repository information */
    git: GitInfo;
    /** Trace context */
    trace: TraceInfo;
    /** Log metadata */
    info: LogInfo;
    /** Source file context */
    context: ContextInfo;
    /** Log input data */
    input: InputInfo;
    /** Status information (only present for status logs) */
    status?: StatusInfo;
    /** Convert log entry to formatted string */
    toString(): string;
}

// =============================================================================
// Trace Types
// =============================================================================

/**
 * Options for trace function
 */
interface TraceOptions {
    /** Custom trace ID or W3C traceparent string */
    traceId?: string;
    /** Tracestate as string or parsed array */
    tracestate?: string | Array<{ key: string; value: string }>;
    /** Label for this span */
    spanLabel?: string;
    /** Headers to include in trace context */
    headers?: { [key: string]: string };
}

/**
 * W3C trace context headers
 */
interface TraceHeaders {
    'x-git-hash'?: string;
    traceparent: string;
    tracestate: string;
    [key: string]: string | undefined;
}

// =============================================================================
// Logging Function Types
// =============================================================================

/**
 * Log function with optional .at() method for source location override
 */
interface LogFunction {
    /**
     * Log a message
     * @param message - Message string
     */
    (message: string): LogEntry;
    /**
     * Log a value
     * @param value - Any value to log
     */
    (value: unknown): LogEntry;
    /**
     * Log an error
     * @param error - Error object
     */
    (error: Error): LogEntry;
    /**
     * Log a message with a value
     * @param message - Message string
     * @param value - Any value to log
     */
    (message: string, value: unknown): LogEntry;
    /**
     * Log a message with an error
     * @param message - Message string
     * @param error - Error object
     */
    (message: string, error: Error): LogEntry;
    /**
     * Log a value with an error
     * @param value - Any value to log
     * @param error - Error object
     */
    (value: unknown, error: Error): LogEntry;
    /**
     * Log an error with a value
     * @param error - Error object
     * @param value - Any value to log
     */
    (error: Error, value: unknown): LogEntry;
    /**
     * Log a message with value and error
     * @param message - Message string
     * @param value - Any value to log
     * @param error - Error object
     */
    (message: string, value: unknown, error: Error): LogEntry;
    /**
     * Log a message with error and value
     * @param message - Message string
     * @param error - Error object
     * @param value - Any value to log
     */
    (message: string, error: Error, value: unknown): LogEntry;
    /**
     * Log with explicit source location
     */
    at: (from: { file: string; line: number; col?: number }, ...args: unknown[]) => LogEntry;
}

/**
 * Timer log entry with timing information
 */
interface TimerLogEntry extends LogEntry {
    input: InputInfo & {
        value: {
            tag: string;
            elapsed: number;
            increment: number;
        };
    };
}

// =============================================================================
// Express Middleware Types
// =============================================================================

/**
 * Express-compatible request object (minimal interface for middleware)
 */
interface ExpressRequest {
    headers: { [key: string]: string | string[] | undefined };
    socket?: { remoteAddress?: string };
    connection?: {
        remoteAddress?: string;
        socket?: { remoteAddress?: string };
    };
    ip?: string;
}

/**
 * Express-compatible response object (minimal interface for middleware)
 */
interface ExpressResponse {
    [key: string]: unknown;
}

/**
 * Express-compatible next function
 */
type ExpressNextFunction = () => void;

// =============================================================================
// Main Scribbles Interface
// =============================================================================

/**
 * Trace function with headers method
 */
interface TraceFunction {
    /**
     * Create a trace context and execute callback
     * @param callback - Function to execute within trace context
     */
    (callback: (spanId: string) => void): void;
    /**
     * Create a labeled trace context
     * @param label - Span label
     * @param callback - Function to execute within trace context
     */
    (label: string, callback: (spanId: string) => void): void;
    /**
     * Create a trace context with options
     * @param options - Trace options
     * @param callback - Function to execute within trace context
     */
    (options: TraceOptions, callback: (spanId: string) => void): void;
    /**
     * Get W3C trace context headers (must be called inside a trace)
     * @param customHeaders - Optional custom headers to merge
     */
    headers: (customHeaders?: { [key: string]: string }) => TraceHeaders;
}

/**
 * Middleware collection
 */
interface Middleware {
    /**
     * Express middleware that creates trace context from incoming request
     */
    express: (req: ExpressRequest, res: ExpressResponse, next: ExpressNextFunction) => void;
}

/**
 * Main scribbles interface
 */
interface Scribbles {
    // Default log levels
    error: LogFunction;
    warn: LogFunction;
    log: LogFunction;
    info: LogFunction;
    debug: LogFunction;

    // Dynamic log levels (added via config.levels)
    [level: string]: LogFunction | unknown;

    /**
     * Configure scribbles options
     */
    config: (options: ScribblesConfig) => void;

    /**
     * Create a trace context
     */
    trace: TraceFunction;

    /**
     * Framework middleware
     */
    middleware: Middleware;

    /**
     * Start or log an intermediate timer value
     * @param tag - Timer identifier
     * @param message - Optional message
     */
    timer: (tag: string, message?: string) => TimerLogEntry;

    /**
     * End a timer and log final value
     * @param tag - Timer identifier
     * @param message - Optional message
     * @throws Error if timer tag does not exist
     */
    timerEnd: (tag: string, message?: string) => TimerLogEntry;

    /**
     * Log system status with performance metrics
     * @param message - Optional message
     */
    status: LogFunction;
}

declare const scribbles: Scribbles;
export = scribbles;
