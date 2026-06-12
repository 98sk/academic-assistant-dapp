# RAG Assistant (`@daa/rag`)

Retrieval-augmented generation pipeline for the AI Assistant. Used by the backend via `POST /api/assistant/query` and `POST /api/assistant/index`.

## Pipeline

1. **Ingest** — `extractPdfText` reads PDFs from `backend/.data/uploads/`
2. **Chunk** — paragraph-aware fixed-size chunks (`chunk.ts`)
3. **Embed** — `@xenova/transformers` (`Xenova/all-MiniLM-L6-v2`) by default; optional OpenAI embeddings if `OPENAI_API_KEY` is set
4. **Index** — JSON vector store at `rag/data/index.json`
5. **Retrieve** — top-k cosine similarity
6. **Generate** — OpenAI chat if API key present; otherwise labeled context-only synthesis

## Commands

```bash
cd rag && npm install && npm run build
```

The backend build runs this automatically (`npm run build` in `backend/`).

## Integration

| Component | Role |
|-----------|------|
| `backend/src/services/rag/` | ACL, config, auto-index on upload |
| `backend/src/routes/assistant.routes.ts` | HTTP API |
| `frontend/src/views/assistant/AssistantPage.tsx` | Chat UI |

## Index data

`rag/data/index.json` is created at runtime. It is safe to delete to force re-indexing.
