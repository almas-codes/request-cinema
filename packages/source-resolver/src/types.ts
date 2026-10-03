export interface SourceLocation {
  file?: string | undefined;
  function?: string | undefined;
  line?: number | undefined;
  codeSnippet?: string | undefined;
  resolvedVia: 'explicit_attr' | 'stack_trace' | 'name_heuristic' | 'unresolved';
}

export interface GitCommitInfo {
  hash: string;
  author: string;
  message: string;
  date: string;
  relativeTime: string;
}

export interface GitBlameInfo {
  line: number;
  commitHash: string;
  author: string;
  date: string;
  content: string;
}

export interface ResolverOptions {
  sourceRoots: readonly string[];
  maxRecentDays?: number | undefined;
}
