import { simpleGit } from 'simple-git';
import type { GitBlameInfo, GitCommitInfo } from './types.js';

export class GitService {
  private repoRoot: string;

  constructor(repoRoot: string) {
    this.repoRoot = repoRoot;
  }

  async getFileLog(filePath: string, maxCommits = 10): Promise<GitCommitInfo[]> {
    try {
      const git = simpleGit(this.repoRoot);
      const log = await git.log({
        file: filePath,
        maxCount: maxCommits,
      });

      return log.all.map((c) => ({
        hash: c.hash.slice(0, 8),
        author: c.author_name,
        message: c.message,
        date: c.date,
        relativeTime: c.date,
      }));
    } catch {
      return [];
    }
  }

  async getLineBlame(filePath: string, targetLine: number): Promise<GitBlameInfo | null> {
    try {
      const git = simpleGit(this.repoRoot);
      const output = await git.raw([
        'blame',
        '-L',
        `${targetLine},${targetLine}`,
        '--porcelain',
        filePath,
      ]);
      const lines = output.split('\n');
      const firstLine = lines[0] ?? '';
      const commitHash = firstLine.split(' ')[0] ?? 'unknown';

      let author = 'Unknown';
      let date = '';
      let content = '';

      for (const line of lines) {
        if (line.startsWith('author ')) author = line.replace('author ', '');
        if (line.startsWith('author-time '))
          date = new Date(
            Number.parseInt(line.replace('author-time ', ''), 10) * 1000,
          ).toISOString();
        if (line.startsWith('\t')) content = line.slice(1);
      }

      return {
        line: targetLine,
        commitHash,
        author,
        date,
        content,
      };
    } catch {
      return null;
    }
  }
}
