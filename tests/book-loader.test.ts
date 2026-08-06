import { describe, expect, it } from 'vitest';
import { BookLoader } from '../src/loaders/book-loader.js';

describe('BookLoader', () => {
  it('loads the sample book specification', async () => {
    const book = await new BookLoader().load('books/modern-java/book.yaml');
    expect(book.book.id).toBe('modern-java');
    expect(book.chapters).toHaveLength(18);
    expect(book.chapters[0]?.objectives).toHaveLength(4);
  });

  it('rejects an invalid specification', async () => {
    await expect(new BookLoader().load('does-not-exist.yaml')).rejects.toThrow(
      'Could not load book specification',
    );
  });
});
