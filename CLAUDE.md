@AGENTS.md

# The Stack (all free-tier)

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js (App Router) + TypeScript | One codebase, deploys free on Vercel, great streaming support |
| Styling | Tailwind + shadcn/ui | Clean, modern look with minimal effort |
| AI orchestration | Vercel AI SDK | Free, open-source; handles streaming + model calls |
| Generation model | Gemini 2.5 Flash | Free tier ~1,500 requests/day — far more than a demo needs |
| Embeddings | gemini-embedding-001 (Gemini) | Free tier, 768-dim vectors |
| Database + vectors | Supabase (Postgres + pgvector) | Free tier covers auth, storage, and vector search in one place |
| File storage | Supabase Storage | Store the original uploaded files |
| Hosting | Vercel (Hobby tier) | Free, push-to-deploy, Supabase auth as well |