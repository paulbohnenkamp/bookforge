# Book specifications

This directory contains YAML book specifications consumed by BookForge.

The public repository includes only the small `bookforge-tutorial` example.
Create other books locally under `books/<book-id>/book.yaml`; production and
private specifications are ignored by default and should not be committed.

Validate a local book before generating it:

```bash
npm run dev -- validate books/my-book/book.yaml
npm run dev -- generate my-book --provider mock
```

Use `git status` and `git check-ignore -v books/my-book/book.yaml` before
committing. If a private specification was previously tracked, remove it from
the index with `git rm -r --cached books/my-book` without deleting the local
files.
