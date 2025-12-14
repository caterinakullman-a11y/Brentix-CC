import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface ApiCallState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
}

interface UseApiCallOptions {
  retryCount?: number;
  retryDelays?: number[];
  showToast?: boolean;
  logErrors?: boolean;
}

const defaultRetryDelays = [5000, 15000, 30000]; // 5s, 15s, 30s

const friendlyErrorMessages: Record<string, string> = {
  "Failed to fetch": "Unable to connect. Please check your internet connection.",
  "NetworkError": "Network error. Please check your connection.",
  "TypeError": "Something went wrong. Please try again.",
  "AbortError": "Request timed out. Please try again.",
  "PGRST": "Database error. Please try again later.",
};

function getFriendlyMessage(error: Error | string): string {
  const errorStr = typeof error === "string" ? error : error.message;
  
  for (const [key, message] of Object.entries(friendlyErrorMessages)) {
    if (errorStr.includes(key)) {
      return message;
    }
  }
  
  return "Something went wrong. Please try again.";
}

async function logError(
  errorType: string,
  errorMessage: string,
  stackTrace?: string,
  endpoint?: string,
  severity: "info" | "warning" | "error" | "critical" = "error"
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    await supabase.from("error_logs").insert({
      error_type: errorType,
      error_message: errorMessage,
      stack_trace: stackTrace,
      user_id: user?.id,
      endpoint,
      severity,
    });
  } catch (e) {
    console.error("Failed to log error:", e);
  }
}

export function useApiCall<T>(
  options: UseApiCallOptions = {}
) {
  const {
    retryCount = 3,
    retryDelays = defaultRetryDelays,
    showToast = true,
    logErrors = true,
  } = options;

  const [state, setState] = useState<ApiCallState<T>>({
    data: null,
    isLoading: false,
    error: null,
  });

  const execute = useCallback(
    async (
      apiCall: () => Promise<T>,
      endpoint?: string
    ): Promise<T | null> => {
      setState({ data: null, isLoading: true, error: null });

      let lastError: Error | null = null;
      let attempts = 0;

      while (attempts <= retryCount) {
        try {
          const result = await apiCall();
          setState({ data: result, isLoading: false, error: null });
          return result;
        } catch (error) {
          lastError = error as Error;
          attempts++;

          if (attempts <= retryCount) {
            const delay = retryDelays[attempts - 1] || retryDelays[retryDelays.length - 1];
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      }

      const friendlyMessage = getFriendlyMessage(lastError!);
      setState({ data: null, isLoading: false, error: friendlyMessage });

      if (logErrors && lastError) {
        logError(
          lastError.name || "ApiError",
          lastError.message,
          lastError.stack,
          endpoint,
          "error"
        );
      }

      if (showToast) {
        toast({
          variant: "destructive",
          title: "Error",
          description: friendlyMessage,
        });
      }

      return null;
    },
    [retryCount, retryDelays, showToast, logErrors]
  );

  const retry = useCallback(
    (apiCall: () => Promise<T>, endpoint?: string) => {
      return execute(apiCall, endpoint);
    },
    [execute]
  );

  return {
    ...state,
    execute,
    retry,
  };
}

export { logError };
