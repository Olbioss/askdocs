import { db } from "./index";
import { documents } from "./schema";

/** Insert a new document row (status: processing) and return it. */
export async function createDocument(input: {
  userId: string;
  filename: string;
  filePath: string;
}) {
  const [doc] = await db
    .insert(documents)
    .values({ ...input, status: "processing" })
    .returning();
  return doc;
}
