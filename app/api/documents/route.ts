// list / delete
//
// Stub: not implemented yet. The frontend reaches these via
// lib/data/client.ts (currently mocked). Implement list (GET) and
// delete (DELETE ?id=) against the documents table, then flip USE_MOCKS.

export async function GET() {
  return Response.json(
    { error: "Not implemented", hint: "Document listing is not wired up yet." },
    { status: 501 },
  );
}

export async function DELETE() {
  return Response.json(
    { error: "Not implemented", hint: "Document deletion is not wired up yet." },
    { status: 501 },
  );
}
