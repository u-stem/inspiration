export type SortOrder =
  | "relevance"
  | "reading_asc"
  | "reading_desc"
  | "mora_asc"
  | "mora_desc";

export interface Phoneme {
  consonant: string;
  vowel: string;
  display?: string;
}

export interface PatternSearchRequest {
  reading: string;
  pattern: string;
  sort: SortOrder;
  limit: number;
  offset: number;
}

export interface PatternAnalyzeResponse {
  reading: string;
  phonemes: Phoneme[];
  vowel_pattern: string;
  consonant_pattern: string;
}

export interface PatternRhymeResult {
  word: string;
  reading: string;
  phonemes: Phoneme[];
  vowel_pattern: string;
  consonant_pattern: string;
  mora_count: number;
  score: number;
}

export interface PatternSearchResponse {
  input: PatternAnalyzeResponse;
  pattern: string;
  results: PatternRhymeResult[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface HistoryItem {
  word: string;
  timestamp: number;
}

export interface FavoriteItem {
  word: string;
  reading: string;
  vowels: string;
  addedAt: number;
}

export interface IndexUpdateResponse {
  added: number;
  total: number;
  message: string;
}

export type PresetType = "suffix" | "prefix" | "vowel" | "contains" | "exact" | "custom";
