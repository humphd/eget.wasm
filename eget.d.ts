/**
 * Callback function for download progress updates.
 * @param url - The URL being downloaded.
 * @param currentBytes - The number of bytes downloaded so far.
 * @param totalBytes - The total number of bytes to download.
 *   Can be -1 if the total size is unknown.
 */
export type ProgressCallback = (
  url: string,
  currentBytes: number,
  totalBytes: number,
) => void;

/**
 * Configuration options for creating a new Eget instance.
 */
export interface EgetOptions {
  /** Host's working directory for final output (defaults to `process.cwd()`). */
  cwd?: string;
  /** Temporary directory for downloaded files (defaults to `./.eget`). */
  tmpDir?: string;
  /** Optional callback for download progress updates. */
  onProgress?: ProgressCallback;
  /** Enable verbose logging, useful for debugging eget.wasm. */
  verbose?: boolean;
}

/**
 * Represents a parsed error from the eget WASM binary.
 */
export interface EgetError {
  /** The file path associated with the error, if available. */
  path: string | null;
  /** The URL associated with the error, if available. */
  url: string | null;
  /** The error message. */
  error: string;
}

/**
 * Options for the `eget.download()` method.
 */
export interface DownloadOptions {
  /** Target system (e.g., 'linux/amd64'). Auto-detected if not provided. */
  system?: string;
  /** Asset name pattern to match. */
  asset?: string;
  /** Specific release tag. */
  tag?: string;
  /** Include pre-release versions. */
  preRelease?: boolean;
  /** Extract specific file from archive. */
  file?: string;
  /**
   * Path relative to the Eget instance's `cwd`.
   * If a single asset results, 'to' is its target path.
   * If multiple assets or `all` is included, 'to' is a subdirectory.
   */
  to?: string;
  /** Only upgrade if newer version available. */
  upgradeOnly?: boolean;
  /** Remove archive after extraction. */
  removeArchive?: boolean;
  /** Extract all files from archive. */
  extractAll?: boolean;
  /** Download the source code for the target repo instead of a release. */
  source?: boolean;
  /** Stop after downloading the asset (no extraction). */
  downloadOnly?: boolean;
  /** Timeout (ms) for downloads. */
  timeout?: number;
  /** Optional callback for download progress updates. */
  onProgress?: ProgressCallback;
}

/**
 * The result of a `eget.run()` operation.
 */
export interface RunResult {
  /** Whether the operation succeeded. */
  success: boolean;
  /** URL that needs to be downloaded (if success is false). */
  url?: string | null;
  /** Path associated with the error. */
  path?: string | null;
  /** Error message. */
  error?: string;
}

/**
 * Options for the `eget()` convenience function.
 * Combines EgetOptions and DownloadOptions with an extra `skipCleanup` flag.
 */
export type EgetFunctionOptions = EgetOptions &
  DownloadOptions & {
    /** Whether to skip automatic cleanup of temp files (for debugging). */
    skipCleanup?: boolean;
  };

/**
 * HTTP errors
 */
export declare class HttpError extends Error {
  statusCode: number;
  url: string;
  constructor(message: string, statusCode: number, url: string);
}

/**
 * Error for 404 Not Found responses.
 */
export declare class HttpErrorNotFound extends HttpError {
  constructor(message: string, url: string);
}

/**
 * Error for 500/503 server responses.
 */
export declare class HttpErrorServer extends HttpError {
  constructor(message: string, statusCode: number, url: string);
}

/**
 * Error for 403/429 Rate Limit responses.
 */
export declare class HttpErrorRateLimit extends HttpError {
  retryAfter: Date | null;
  constructor(
    message: string,
    statusCode: number,
    url: string,
    headers: Headers,
  );
  calculateRetryAfter(headers: Headers): Date | null;
}

/**
 * Node.js wrapper for eget WASM binary.
 */
export declare class Eget {
  /** Cached promise for the compiled WASM module. */
  static wasmCompilationPromise: Promise<WebAssembly.Module> | null;

  /** Temporary directory for downloaded files. */
  readonly tmpDir: string;

  /** Host's working directory for final output. */
  readonly cwd: string;

  /** Enable verbose logging. */
  readonly verbose: boolean;

  /** Optional callback for download progress updates. */
  readonly onProgress: ProgressCallback | undefined;

  /**
   * Creates a new Eget instance.
   * @param options - Configuration options
   */
  constructor(options?: EgetOptions);

  /**
   * Loads and compiles the WASM module, caching the compilation promise.
   * @returns Compiled WASM module
   * @throws If WASM file cannot be loaded or compiled
   */
  getWasmModule(): Promise<WebAssembly.Module>;

  /**
   * Logs a message to stderr if verbose mode is enabled.
   * @param message - Messages to log
   */
  log(...message: any[]): void;

  /**
   * Downloads a file from a URL to a local path.
   * @param url - URL to download from
   * @param filePath - Local file path to save to
   * @param onProgress - Optional callback for progress updates
   * @param timeoutMs - The timeout (ms) to wait (defaults to 30s)
   */
  downloadFile(
    url: string,
    filePath: string,
    onProgress?: ProgressCallback,
    timeoutMs?: number,
  ): Promise<void>;

  /**
   * Runs the eget WASM binary with the given arguments.
   * @param args - Command line arguments for eget
   * @param runOptions - Options for WASI execution
   * @returns Result of the operation
   */
  run(
    args: string[],
    runOptions?: { wasmSandboxDir?: string },
  ): Promise<RunResult>;

  /**
   * Downloads assets from a GitHub repository using eget.
   * @param repo - GitHub repository in format 'owner/repo'
   * @param options - Download options
   * @returns True if download succeeded, false otherwise
   * @throws HttpError if a recoverable HTTP error occurs
   * @throws Error if a non-recoverable error occurs
   */
  download(repo: string, options?: DownloadOptions): Promise<boolean>;

  /**
   * Cleans up temporary files created during downloads.
   */
  cleanup(): Promise<void>;
}

/**
 * Detects the current system platform and architecture as expected by eget.
 * @returns System string in format 'platform/arch' (e.g., 'linux/amd64')
 */
export declare function detectSystem(): string;

/**
 * Convenience function to download a GitHub repository release with automatic cleanup.
 * Creates an Eget instance, downloads the specified release, and cleans up temporary files.
 *
 * @param repo - GitHub repository in format 'owner/repo'
 * @param options - Download options
 * @returns True if download succeeded, false otherwise
 *
 * @example
 * // Download sops for current platform to current dir
 * await eget('getsops/sops');
 *
 * @example
 * // Download repo release with specific version to a custom location
 * await eget('cli/cli', {
 *   system: 'linux/amd64',
 *   tag: 'v2.40.1',
 *   to: './bin/custom-name',
 *   verbose: true
 * });
 *
 * @example
 * // Download with asset filtering, put in different directory
 * await eget('goreleaser/goreleaser', {
 *   asset: '^json',  // Exclude JSON files
 *   extractAll: true,
 *   cwd: '/usr/local/eget_downloads'
 * });
 */
export declare function eget(
  repo: string,
  options?: EgetFunctionOptions,
): Promise<boolean>;
