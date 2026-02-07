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
  mora_min?: number;
  mora_max?: number;
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
  similarity_score: number;
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

export type SearchLanguage = "ja" | "en";

export type RubyFormat = "katakana" | "half-katakana" | "hiragana";

export type ResultTab = "search" | "favorites" | "notes";

// English rhyme search types
export interface EnglishRhymeResult {
  word: string;
  pronunciation: string;
  katakana: string;
  vowel_pattern: string;
  consonant_pattern: string;
  syllable_count: number;
  score: number;
  similarity_score: number;
}

export interface EnglishSearchRequest {
  reading: string;
  pattern: string;
  sort: SortOrder;
  limit: number;
  offset: number;
  mora_min?: number;
  mora_max?: number;
}

export interface EnglishSearchResponse {
  input: PatternAnalyzeResponse;
  pattern: string;
  results: EnglishRhymeResult[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// Lyrics analysis types
export interface LyricsWord {
  surface: string;
  reading: string;
  vowel_pattern: string;
  pos: string;
}

export interface LyricsAnalyzeResponse {
  words: LyricsWord[];
  total_words: number;
  unique_words: number;
}

export interface LyricsEntry {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  words: LyricsWord[];
}

export interface CreativeStats {
  wordUsageCount: Record<string, number>;
  rhymeUsageCount: Record<string, number>;
}
