import { z } from 'zod';

export const chapterSchema = z.object({
  id: z.string().trim().min(1),
  title: z.string().trim().min(1),
  targetWords: z.number().int().positive(),
  objectives: z.array(z.string().trim().min(1)).min(3).max(7).optional(),
  topics: z.array(z.string().trim().min(1)).min(1).optional(),
  topicsToAvoid: z.array(z.string().trim().min(1)).min(1).optional(),
  canonicalExample: z
    .object({
      name: z.string().trim().min(1),
      description: z.string().trim().min(1),
      entities: z.array(z.string().trim().min(1)).optional(),
      constraints: z.array(z.string().trim().min(1)).optional(),
    })
    .optional(),
});

const bookMetadataSchema = z.object({
  id: z.string().trim().min(1),
  title: z.string().trim().min(1),
  subtitle: z.string().trim().min(1).optional(),
  audience: z.array(z.string().trim().min(1)).min(1).optional(),
});

const styleSchema = z.object({
  tone: z.string().trim().min(1),
  includeInterviewQuestions: z.boolean().default(false),
  includeExercises: z.boolean().default(false),
});

const outputSchema = z.object({
  markdown: z.boolean().default(true),
  zip: z.boolean().default(false),
});

export const bookSchema = z.object({
  book: bookMetadataSchema,
  style: styleSchema,
  output: outputSchema,
  chapters: z.array(chapterSchema).min(1),
});

export type Book = z.infer<typeof bookSchema>;
export type Chapter = z.infer<typeof chapterSchema>;

export function parseBook(value: unknown): Book {
  return bookSchema.parse(value);
}
