import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, RefreshCw, Send, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import {
  queryAssistant,
  fetchAssistantIndexStatus,
  indexAssistantDocuments,
  type AssistantQueryResponse,
  type AssistantSource
} from "../../features/assistant/assistantApi";
import { ApiError } from "../../lib/api/client";
import { useToast } from "../../shared/ui/Toast";
import { Button } from "../../shared/ui/Button";
import { Card, CardBody, CardHeader } from "../../shared/ui/Card";
import { Input } from "../../shared/ui/Input";
import { PageHeader } from "../../shared/ui/PageHeader";
import { useReducedMotion } from "../../shared/motion/presets";

const NO_INDEX_CHAT_FR =
  "Je n'ai pas encore de documents indexés. Téléversez un PDF dans Documents, attendez l'indexation, puis reposez votre question.";

type ChatMessage =
  | { id: string; role: "user"; content: string }
  | {
      id: string;
      role: "assistant";
      content: string;
      mode: AssistantQueryResponse["mode"];
      sources: AssistantSource[];
      needsIndex?: boolean;
      partialError?: string;
    };

function newId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/** API returns cosine similarity in [0, 1]; hide misleading zeros from corrupt legacy indexes. */
function formatSourceScore(score: number | undefined): string {
  if (score == null || !Number.isFinite(score) || score <= 0) return "—";
  if (score >= 0.01) return `${Math.round(score * 100)} %`;
  return score.toFixed(3);
}

function SourcesList({ sources }: { sources: AssistantSource[] }) {
  if (sources.length === 0) return null;
  return (
    <div className="mt-3 space-y-2 border-t border-border-subtle/60 pt-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Sources</p>
      <ul className="space-y-2">
        {sources.map((s) => (
          <li
            key={s.chunkId}
            className="rounded-lg border border-border-subtle/60 bg-surface/40 px-3 py-2 text-xs backdrop-blur-sm"
          >
            <div className="font-medium text-primary">
              {s.filename}{" "}
              <span className="font-normal text-muted">
                (#{s.documentId} · pertinence {formatSourceScore(s.score)})
              </span>
            </div>
            <p className="mt-1 text-muted line-clamp-4">{s.snippet}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AssistantPage() {
  const toast = useToast();
  const reduced = useReducedMotion();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Posez une question sur vos documents académiques indexés (PDF et annonces). Les réponses s'appuient sur la recherche sémantique dans vos contenus accessibles.",
      mode: "context-only",
      sources: []
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [reindexing, setReindexing] = useState(false);
  const [indexEmpty, setIndexEmpty] = useState<boolean | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void fetchAssistantIndexStatus()
      .then((s) => setIndexEmpty(s.needsIndex))
      .catch(() => setIndexEmpty(null));
  }, []);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    });
  }, []);

  const appendAssistant = useCallback(
    (payload: {
      content: string;
      mode: AssistantQueryResponse["mode"];
      sources: AssistantSource[];
      needsIndex?: boolean;
      partialError?: string;
    }) => {
      setMessages((prev) => [
        ...prev,
        {
          id: newId(),
          role: "assistant",
          content: payload.content,
          mode: payload.mode,
          sources: payload.sources,
          needsIndex: payload.needsIndex,
          partialError: payload.partialError
        }
      ]);
    },
    []
  );

  const send = useCallback(async () => {
    const question = input.trim();
    if (!question || loading) return;

    setInput("");
    const userMsg: ChatMessage = { id: newId(), role: "user", content: question };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    scrollToBottom();

    try {
      const res = await queryAssistant({ question });
      appendAssistant({
        content: res.needsIndex ? NO_INDEX_CHAT_FR : res.answer,
        mode: res.mode,
        sources: res.sources,
        needsIndex: res.needsIndex
      });
      if (res.needsIndex) {
        setIndexEmpty(true);
      } else if (res.sources.length > 0) {
        setIndexEmpty(false);
      }
    } catch (e) {
      const msg =
        e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Échec de la requête";
      const isNoIndex =
        msg.toLowerCase().includes("no indexed content") ||
        msg.toLowerCase().includes("index them");
      if (isNoIndex) {
        appendAssistant({
          content: NO_INDEX_CHAT_FR,
          mode: "context-only",
          sources: [],
          needsIndex: true
        });
        setIndexEmpty(true);
      } else {
        appendAssistant({
          content: `Désolé, une erreur s'est produite : ${msg}`,
          mode: "context-only",
          sources: [],
          partialError: msg
        });
        toast.error(msg);
      }
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  }, [input, loading, scrollToBottom, toast, appendAssistant]);

  const handleReindex = useCallback(async () => {
    setReindexing(true);
    try {
      const out = await indexAssistantDocuments();
      const indexed = out.indexed as Array<{ chunksIndexed: number; error?: string }> | undefined;
      const total = indexed?.reduce((n, r) => n + (r.chunksIndexed ?? 0), 0) ?? out.chunksIndexed ?? 0;
      const errors = indexed?.filter((r) => r.error).map((r) => r.error) ?? [];

      if (total > 0) {
        setIndexEmpty(false);
        toast.success(`${total} segment(s) indexé(s).`);
        appendAssistant({
          content: `Indexation terminée : ${total} segment(s) prêts pour vos questions.`,
          mode: "context-only",
          sources: []
        });
      } else if (errors.length > 0) {
        appendAssistant({
          content: `Indexation partielle : ${errors[0]}`,
          mode: "context-only",
          sources: [],
          partialError: errors.join("; ")
        });
        toast.error(errors[0] ?? "Indexation échouée");
      } else {
        appendAssistant({
          content: NO_INDEX_CHAT_FR,
          mode: "context-only",
          sources: [],
          needsIndex: true
        });
      }
    } catch (e) {
      const msg =
        e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Indexation échouée";
      appendAssistant({
        content: `Échec de l'indexation : ${msg}`,
        mode: "context-only",
        sources: [],
        partialError: msg
      });
      toast.error(msg);
    } finally {
      setReindexing(false);
      scrollToBottom();
    }
  }, [appendAssistant, toast]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assistant IA"
        subtitle="RAG sur vos PDF académiques — réponses avec citations des extraits sources."
      />

      {indexEmpty ? (
        <div
          className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-primary"
          role="status"
        >
          Aucun contenu indexé pour le moment.{" "}
          <Link to="/documents" className="font-medium text-accent underline-offset-2 hover:underline">
            Téléversez un PDF dans Documents
          </Link>
          , attendez l&apos;indexation automatique, puis posez votre question ici.
        </div>
      ) : null}

      <Card className="flex min-h-[28rem] flex-col" delay={0.1}>
        <CardHeader
          title={
            <span className="flex items-center gap-2">
              <Sparkles className="size-4 text-accent" />
              Chat
            </span>
          }
          subtitle={
            loading
              ? "Recherche dans l'index et génération…"
              : "Documents accessibles selon votre rôle et groupe"
          }
          right={
            <Button
              variant="secondary"
              className="px-3 py-2 text-xs"
              leftIcon={<RefreshCw className="size-3.5" />}
              loading={reindexing}
              disabled={loading || reindexing}
              onClick={() => void handleReindex()}
            >
              Réindexer mes documents
            </Button>
          }
        />
        <CardBody className="flex flex-1 flex-col gap-3">
          <div
            ref={listRef}
            className="flex max-h-[24rem] min-h-[16rem] flex-col gap-3 overflow-y-auto rounded-xl border border-border-subtle/60 bg-surface/30 p-4 backdrop-blur-sm"
          >
            <AnimatePresence initial={false}>
              {messages.map((m) =>
                m.role === "user" ? (
                  <motion.div
                    key={m.id}
                    initial={reduced ? false : { opacity: 0, x: 20, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    transition={reduced ? { duration: 0 } : { duration: 0.3 }}
                    className="flex justify-end"
                  >
                    <div className="max-w-[85%] rounded-2xl rounded-br-md bg-gradient-primary px-4 py-2.5 text-sm text-white shadow-md">
                      {m.content}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key={m.id}
                    initial={reduced ? false : { opacity: 0, x: -20, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    transition={reduced ? { duration: 0 } : { duration: 0.3 }}
                    className="flex justify-start"
                  >
                    <div
                      className={`max-w-[90%] rounded-2xl rounded-bl-md border px-4 py-3 text-sm shadow-sm backdrop-blur-sm ${
                        m.needsIndex
                          ? "border-amber-500/40 bg-amber-500/10 text-primary"
                          : "border-border-subtle/60 bg-surface/70 text-primary"
                      }`}
                    >
                      {m.id !== "welcome" && !m.needsIndex && (
                        <span className="mb-2 inline-block rounded-md bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
                          {m.mode === "openai" ? "OpenAI" : "Contexte seul"}
                        </span>
                      )}
                      {m.needsIndex ? (
                        <span className="mb-2 inline-block rounded-md bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                          Index requis
                        </span>
                      ) : null}
                      <div className="whitespace-pre-wrap">{m.content}</div>
                      {m.partialError ? (
                        <p className="mt-2 text-xs text-danger">{m.partialError}</p>
                      ) : null}
                      <SourcesList sources={m.sources} />
                    </div>
                  </motion.div>
                )
              )}
            </AnimatePresence>
            {loading ? (
              <motion.div
                initial={reduced ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 text-sm text-muted"
              >
                <Loader2 className="size-4 animate-spin text-accent" />
                Analyse en cours…
              </motion.div>
            ) : null}
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="Ex. Résume les objectifs du cours…"
              className="flex-1"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={loading || reindexing}
              maxLength={2000}
            />
            <Button
              variant="success"
              leftIcon={loading ? undefined : <Send className="size-4" />}
              loading={loading}
              onClick={() => void send()}
              disabled={loading || reindexing || !input.trim()}
            >
              Envoyer
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
