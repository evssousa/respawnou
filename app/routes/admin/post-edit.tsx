import { useState } from "react";
import { data, Form, Link, redirect, useNavigation } from "react-router";
import type { Route } from "./+types/post-edit";
import { adminMeta, Button, Card, Field, inputCls, Notice, PageTitle, Pill, when } from "~/components/admin-ui";
import { requireAdmin } from "~/lib/admin/auth.server";
import { blocksToText, textToBlocks } from "~/lib/admin/body-text";
import { getPost, setPostStatus, toggleFeatured, updatePost } from "~/lib/admin/data.server";
import { publish } from "~/lib/robot/robot.server";
import { PLATFORMS } from "~/lib/site";

export const meta = ({ loaderData }: Route.MetaArgs) => adminMeta(loaderData?.post.title ?? "Matéria");

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireAdmin(request);
  const post = await getPost(Number(params.id));
  if (!post) throw data("Matéria não encontrada", { status: 404 });
  const msg = new URL(request.url).searchParams.get("ok");
  return { post, bodyText: blocksToText(post.body), msg };
}

const MESSAGES: Record<string, string> = {
  salvo: "Alterações salvas.",
  publicado: "Matéria publicada.",
  rascunho: "Matéria tirada do ar (voltou para rascunho).",
  arquivado: "Matéria arquivada (fora do ar).",
  destaque: "Destaque na home alterado.",
  refazendo: "O robô está reescrevendo a matéria em segundo plano (leva até ~1 min). Recarregue a página depois; o resultado aparece em Robô.",
};

export async function action({ request, params }: Route.ActionArgs) {
  await requireAdmin(request);
  const id = Number(params.id);
  const form = await request.formData();
  const intent = String(form.get("intent"));
  const back = (ok: string) => redirect(`/admin/materias/${id}?ok=${ok}`);

  if (intent === "publicar") return (await setPostStatus(id, "published"), back("publicado"));
  if (intent === "rascunho") return (await setPostStatus(id, "draft"), back("rascunho"));
  if (intent === "arquivar") return (await setPostStatus(id, "archived"), back("arquivado"));
  if (intent === "destaque") return (await toggleFeatured(id), back("destaque"));
  if (intent === "refazer") {
    publish({ redoPostId: id }).catch((err) => console.error("[admin] refazer:", err));
    return back("refazendo");
  }

  // Salvar
  const title = String(form.get("title") ?? "").trim();
  const body = textToBlocks(String(form.get("body") ?? ""));
  const errors: string[] = [];
  if (title.length < 10) errors.push("Título curto demais.");
  if (!body.length) errors.push("O corpo está vazio.");
  if (errors.length) return data({ errors }, { status: 400 });
  const list = (name: string) => String(form.get(name) ?? "").split(",").map((t) => t.trim()).filter(Boolean);
  await updatePost(id, {
    title,
    excerpt: String(form.get("excerpt") ?? "").trim(),
    metaDescription: String(form.get("metaDescription") ?? "").trim(),
    focusKeyword: String(form.get("focusKeyword") ?? "").trim(),
    tags: list("tags").slice(0, 8),
    platforms: form.getAll("platforms").map(String),
    imageUrl: String(form.get("imageUrl") ?? "").trim(),
    imageAlt: String(form.get("imageAlt") ?? "").trim(),
    imageCredit: String(form.get("imageCredit") ?? "").trim(),
    body,
  });
  return back("salvo");
}

function Counter({ value, min, max }: { value: string; min: number; max: number }) {
  const n = value.length;
  return <span className={n < min || n > max ? "text-warn" : "text-acc"}>{`${n} caracteres (ideal ${min}–${max})`}</span>;
}

export default function AdminPostEdit({ loaderData, actionData }: Route.ComponentProps) {
  const { post, bodyText, msg } = loaderData;
  const busy = useNavigation().state !== "idle";
  const [title, setTitle] = useState(post.title);
  const [metaDesc, setMetaDesc] = useState(post.meta_description ?? "");
  const url = `/${post.section}/${post.slug}`;

  return (
    <>
      <PageTitle
        aside={
          <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
            <Pill status={post.status} />
            {post.featured ? <span className="text-acc">★ destaque</span> : null}
            {post.status === "published" && (
              <a href={url} target="_blank" rel="noopener" className="text-acc underline">
                ver no site ↗
              </a>
            )}
          </div>
        }
      >
        Editar matéria
      </PageTitle>
      <p className="font-mono text-xs text-muted">
        #{post.id} · {url} · publicada {when(post.published_at)} · atualizada {when(post.updated_at)} · {post.origin === "auto" ? "robô" : "manual"}
        {post.source_url && (
          <>
            {" "}
            · fonte:{" "}
            <a href={post.source_url} target="_blank" rel="noopener" className="underline">
              {post.source_name}
            </a>
          </>
        )}
      </p>

      {msg && MESSAGES[msg] && <Notice>{MESSAGES[msg]}</Notice>}
      {actionData?.errors && <Notice tone="warn">{actionData.errors.join(" ")}</Notice>}

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <Form method="post" className="flex flex-col gap-4">
          <Field label="Título" hint={<Counter value={title} min={30} max={70} />}>
            <input name="title" value={title} onChange={(e) => setTitle(e.target.value)} required className={inputCls} />
          </Field>
          <Field label="Linha fina">
            <textarea name="excerpt" defaultValue={post.excerpt} rows={2} className={inputCls} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Palavra-chave">
              <input name="focusKeyword" defaultValue={post.focus_keyword ?? ""} className={inputCls} />
            </Field>
            <Field label="Tags" hint="separadas por vírgula">
              <input name="tags" defaultValue={post.tags.join(", ")} className={inputCls} />
            </Field>
          </div>
          <Field label="Descrição para o Google" hint={<Counter value={metaDesc} min={120} max={160} />}>
            <textarea name="metaDescription" value={metaDesc} onChange={(e) => setMetaDesc(e.target.value)} rows={2} className={inputCls} />
          </Field>
          <fieldset className="flex flex-wrap gap-4">
            <legend className="mb-1.5 font-mono text-xs font-bold uppercase text-body">Plataformas</legend>
            {PLATFORMS.map((p) => (
              <label key={p.slug} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="platforms" value={p.slug} defaultChecked={post.platforms.includes(p.slug)} className="accent-[var(--color-acc)]" />
                {p.label}
              </label>
            ))}
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-[1fr_1fr]">
            <Field label="Capa (endereço da imagem)">
              <input name="imageUrl" defaultValue={post.image_url ?? ""} className={inputCls} />
            </Field>
            <Field label="Crédito da capa">
              <input name="imageCredit" defaultValue={post.image_credit ?? ""} className={inputCls} />
            </Field>
          </div>
          <Field label="Texto alternativo da capa">
            <input name="imageAlt" defaultValue={post.image_alt ?? ""} className={inputCls} />
          </Field>
          <Field
            label="Corpo"
            hint={
              <>
                Parágrafos separados por linha em branco · <code>## Intertítulo</code> · <code>### Subtítulo</code> · <code>- item</code> ·{" "}
                <code>&gt; citação</code> · <code>[texto](url)</code> · <code>![alt](imagem "crédito")</code> · <code>@video(ID) título</code>
              </>
            }
          >
            <textarea name="body" defaultValue={bodyText} rows={28} className={`${inputCls} font-mono text-sm leading-relaxed`} />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button tone="primary" name="intent" value="salvar" disabled={busy}>
              {busy ? "Salvando..." : "Salvar alterações"}
            </Button>
            <Link to="/admin/materias" className="inline-flex min-h-10 items-center px-4 font-mono text-xs font-bold uppercase text-muted hover:text-paper">
              Voltar
            </Link>
          </div>
        </Form>

        <aside className="flex flex-col gap-4">
          {post.image_url && <img src={post.image_url} alt="" className="w-full border border-line" />}
          <Card title="Ações">
            <Form method="post" className="flex flex-col gap-2">
              {post.status !== "published" && (
                <Button tone="primary" name="intent" value="publicar" disabled={busy}>
                  Publicar
                </Button>
              )}
              {post.status === "published" && (
                <Button name="intent" value="rascunho" disabled={busy}>
                  Tirar do ar (rascunho)
                </Button>
              )}
              <Button name="intent" value="destaque" disabled={busy}>
                {post.featured ? "Tirar destaque da home" : "Destacar na home"}
              </Button>
              {post.fromRobot && (
                <Button
                  name="intent"
                  value="refazer"
                  disabled={busy}
                  onClick={(e) => {
                    if (!confirm("Reescrever a matéria com o robô? O texto atual (e suas edições) será substituído.")) e.preventDefault();
                  }}
                >
                  Refazer com o robô
                </Button>
              )}
              {post.status !== "archived" && (
                <Button
                  tone="danger"
                  name="intent"
                  value="arquivar"
                  disabled={busy}
                  onClick={(e) => {
                    if (!confirm("Arquivar? A matéria sai do ar (dá para publicar de novo depois).")) e.preventDefault();
                  }}
                >
                  Arquivar
                </Button>
              )}
            </Form>
          </Card>
        </aside>
      </div>
    </>
  );
}
