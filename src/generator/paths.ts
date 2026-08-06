import path from 'node:path';

export function filesystemSlug(value: string): string {
  const slug = value
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'item';
}

export function chapterDirectoryName(chapterNumber: number, chapterId: string): string {
  return `${String(chapterNumber).padStart(2, '0')}-${filesystemSlug(chapterId)}`;
}

export function chapterDirectoryPath(
  generatedDirectory: string,
  bookId: string,
  chapterNumber: number,
  chapterId: string,
): string {
  return path.join(
    generatedDirectory,
    bookId,
    'chapters',
    chapterDirectoryName(chapterNumber, chapterId),
  );
}
