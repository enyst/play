export class HealthService {
  private serverUrl: string;

  constructor(serverUrl: string) {
    this.serverUrl = serverUrl;
  }

  async checkHealth(): Promise<{ isHealthy: boolean; error?: string }> {
    try {
      console.log(`Health check: Checking ${this.serverUrl}/health`);
      const response = await fetch(`${this.serverUrl}/health`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        // Add timeout
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      console.log(
        `Health check response: ${response.status} ${response.statusText}`,
      );

      if (response.ok) {
        return { isHealthy: true };
      }
      return {
        isHealthy: false,
        error: `Server responded with status ${response.status}`,
      };
    } catch (error) {
      console.error("Health check error:", error);
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          return {
            isHealthy: false,
            error: "Server health check timed out",
          };
        }
        return {
          isHealthy: false,
          error: `Health check failed: ${error.message}`,
        };
      }
      return {
        isHealthy: false,
        error: "Unknown error during health check",
      };
    }
  }
}
