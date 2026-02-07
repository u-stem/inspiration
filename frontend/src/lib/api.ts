import type {
  EnglishSearchRequest,
  EnglishSearchResponse,
  IndexUpdateResponse,
  LyricsAnalyzeResponse,
  PatternAnalyzeResponse,
  PatternSearchRequest,
  PatternSearchResponse,
} from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const url = `${API_BASE_URL}/api${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new ApiError(response.status, errorText);
  }

  return response.json();
}

export async function searchRhymes(
  request: PatternSearchRequest,
): Promise<PatternSearchResponse> {
  return fetchApi<PatternSearchResponse>("/rhyme/search", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export async function analyzeReading(
  reading: string,
): Promise<PatternAnalyzeResponse> {
  const params = new URLSearchParams({ reading });
  return fetchApi<PatternAnalyzeResponse>(`/rhyme/analyze?${params}`);
}

export async function updateIndex(
  download: boolean = false,
): Promise<IndexUpdateResponse> {
  const params = new URLSearchParams();
  if (download) {
    params.set("download", "true");
  }
  return fetchApi<IndexUpdateResponse>(`/rhyme/update-index?${params}`, {
    method: "POST",
  });
}

export async function searchEnglishRhymes(
  request: EnglishSearchRequest,
): Promise<EnglishSearchResponse> {
  return fetchApi<EnglishSearchResponse>("/rhyme/search/english", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export async function analyzeLyrics(
  text: string,
): Promise<LyricsAnalyzeResponse> {
  return fetchApi<LyricsAnalyzeResponse>("/lyrics/analyze", {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

export { ApiError };
