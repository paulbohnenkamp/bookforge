import { describe, expect, it } from 'vitest';
import { BookResolver } from '../src/generator/book-resolver.js';

describe('BookResolver', () => {
  const resolver = new BookResolver('books');

  it('resolves a book by ID and a chapter by one-based number', async () => {
    const result = await resolver.resolve('modern-java', 1);
    expect(result.specificationPath).toContain('books/modern-java/book.yaml');
    expect(result.chapter.id).toBe('introduction');
  });

  it('reports a missing book', async () => {
    await expect(resolver.resolve('missing-book', 1)).rejects.toThrow(
      "Book 'missing-book' does not exist or is invalid.",
    );
  });

  it('reports a missing chapter', async () => {
    await expect(resolver.resolve('modern-java', 99)).rejects.toThrow(
      "Chapter 99 does not exist in book 'modern-java'.",
    );
  });
});
