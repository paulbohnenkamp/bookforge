import { z } from 'zod';

export const chapterSchema = z.object({
  id: z.string().trim().min(1),
  title: z.string().trim().min(1),
  targetWords: z.number().int().positive(),
  objectives: z.array(z.string().trim().min(1)).min(3).max(7),
  topics: z.array(z.string().trim().min(1)).min(1),
  topicsToAvoid: z.array(z.string().trim().min(1)).min(1).optional(),
  canonicalExample: z
    .object({
      name: z.string().trim().min(1),
      description: z.string().trim().min(1),
      entities: z.array(z.string().trim().min(1)).optional(),
      constraints: z.array(z.string().trim().min(1)).optional(),
    })
    .optional(),
  storyBeat: z.string().trim().min(1).optional(),
});

const storySchema = z.object({
  title: z.string().trim().min(1),
  premise: z.string().trim().min(1),
  cast: z.array(z.string().trim().min(1)).min(1),
  constraints: z.array(z.string().trim().min(1)).min(1),
});

const learningSchema = z.object({
  promise: z.string().trim().min(1),
  prerequisites: z.array(z.string().trim().min(1)).min(1),
  byTheEnd: z.array(z.string().trim().min(1)).min(3),
  deferred: z.array(z.string().trim().min(1)).min(1),
  workflow: z
    .array(
      z.object({
        id: z.string().trim().min(1),
        command: z.string().trim().min(1),
        observation: z.string().trim().min(1),
        artifacts: z.array(z.string().trim().min(1)).min(1),
      }),
    )
    .optional(),
});

const endMatterSchema = z.object({
  glossary: z
    .array(
      z.object({
        term: z.string().trim().min(1),
        definition: z.string().trim().min(1),
      }),
    )
    .optional(),
  indexTerms: z.array(z.string().trim().min(1)).min(1).optional(),
  references: z
    .array(
      z.object({
        title: z.string().trim().min(1),
        author: z.string().trim().min(1).optional(),
        url: z.string().url().optional(),
        note: z.string().trim().min(1).optional(),
      }),
    )
    .optional(),
  appendix: z
    .array(
      z.object({
        title: z.string().trim().min(1),
        content: z.string().trim().min(1),
      }),
    )
    .optional(),
});

const bookMetadataSchema = z.object({
  id: z.string().trim().min(1),
  title: z.string().trim().min(1),
  subtitle: z.string().trim().min(1).optional(),
  author: z.string().trim().min(1).optional(),
  language: z.string().trim().min(1).default('en'),
  cover: z.string().trim().min(1).optional(),
  audience: z.array(z.string().trim().min(1)).min(1).optional(),
});

const styleSchema = z.object({
  tone: z.string().trim().min(1),
  includeInterviewQuestions: z.boolean().default(false),
  includeExercises: z.boolean().default(false),
});

const outputSchema = z.object({
  markdown: z.boolean().default(true),
  pdf: z.boolean().default(false),
  epub: z.boolean().default(false),
  zip: z.boolean().default(false),
});

const frontMatterSchema = z.object({
  version: z.string().trim().min(1).optional(),
  author: z.string().trim().min(1).optional(),
  organization: z.string().trim().min(1).optional(),
  date: z.string().trim().min(1).optional(),
  copyright: z
    .object({
      notice: z.string().trim().min(1).optional(),
      license: z.string().trim().min(1).optional(),
      trademarks: z.array(z.string().trim().min(1)).min(1).optional(),
    })
    .optional(),
  about: z
    .object({
      audience: z.string().trim().min(1).optional(),
      background: z.string().trim().min(1).optional(),
      conventions: z
        .array(
          z.object({
            label: z.string().trim().min(1),
            meaning: z.string().trim().min(1),
          }),
        )
        .min(1)
        .optional(),
    })
    .optional(),
});

export const bookSchema = z.object({
  book: bookMetadataSchema,
  style: styleSchema,
  output: outputSchema,
  frontMatter: frontMatterSchema.optional(),
  story: storySchema.optional(),
  learning: learningSchema.optional(),
  endMatter: endMatterSchema.optional(),
  chapters: z.array(chapterSchema).min(1),
});

export type Book = z.infer<typeof bookSchema>;
export type Chapter = z.infer<typeof chapterSchema>;

export function parseBook(value: unknown): Book {
  return bookSchema.parse(value);
}
