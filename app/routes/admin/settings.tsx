import { useEffect, useState } from "react";
import { data, Form, redirect } from "react-router";
import type { Route } from "./+types/settings";
import { adminMeta, Button, Card, Field, inputCls, Notice, PageTitle } from "~/components/admin-ui";
import { requireAdmin } from "~/lib/admin/auth.server";
import { getSettings, saveSettings } from "~/lib/admin/data.server";
import { AD_PREVIEW_KEY, adsenseClient, type AdUnit } from "~/lib/ads";
import { AD_UNITS, getAdsConfig, saveAdsConfig } from "~/lib/ads.server";
import { SECTIONS } from "~/lib/site";

export const meta = () => adminMeta("Configurações");

// Editorias que o robô sabe escrever sozinho (reviews = consenso da crítica, ainda não automatizado).
const ROBOT_SECTIONS = SECTIONS.filter((s) => s.slug !== "reviews");

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);
  const [s, ads] = await Promise.all([getSettings(), getAdsConfig()]);
  return { s, ads, hasClient: Boolean(adsenseClient()), msg: new URL(request.url).searchParams.get("ok") };
}

export async function action({ request }: Route.ActionArgs) {
  await requireAdmin(request);
  const f = await request.formData();
  // Card "Anúncios": formulário próprio, para salvar o robô não apagar os anúncios (e o contrário).
  if (f.get("intent") === "ads") {
    const slots: Partial<Record<AdUnit, string>> = {};
    for (const u of AD_UNITS) slots[u] = String(f.get(`slot_${u}`) ?? "");
    await saveAdsConfig({ enabled: f.get("ads_enabled") === "on", slots });
    return redirect("/admin/config?ok=ads");
  }
  const int = (name: string, min: number, max: number) => Math.max(min, Math.min(max, Math.round(Number(f.get(name)) || 0)));
  const values = {
    robot_enabled: f.get("robot_enabled") === "on",
    posts_per_day: int("posts_per_day", 0, 24),
    robot_sections: f.getAll("robot_sections").map(String).filter((s) => ROBOT_SECTIONS.some((r) => r.slug === s)),
    robot_min_words: int("robot_min_words", 200, 1500),
    robot_start_hour: int("robot_start_hour", 0, 23),
    robot_end_hour: int("robot_end_hour", 1, 24),
  };
  if (!values.robot_sections.length) return data({ error: "Escolha pelo menos uma editoria." }, { status: 400 });
  if (values.robot_end_hour <= values.robot_start_hour) return data({ error: "O horário final precisa ser depois do inicial." }, { status: 400 });
  await saveSettings(values);
  return redirect("/admin/config?ok=1");
}

export default function AdminSettings({ loaderData, actionData }: Route.ComponentProps) {
  const { s } = loaderData;
  const gap = Math.max(1, Math.floor((s.robot_end_hour - s.robot_start_hour) / Math.max(1, s.posts_per_day)));
  return (
    <>
      <PageTitle>Configurações</PageTitle>
      {loaderData.msg === "ads" && <Notice>Anúncios salvos. Valem em até 1 minuto.</Notice>}
      {loaderData.msg === "1" && <Notice>Configurações salvas. Valem a partir da próxima execução do robô.</Notice>}
      {actionData?.error && <Notice tone="warn">{actionData.error}</Notice>}
      <Form method="post" className="flex max-w-2xl flex-col gap-4">
        <Card title="Robô de publicação">
          <div className="flex flex-col gap-4">
            <label className="flex items-center gap-3 text-paper">
              <input type="checkbox" name="robot_enabled" defaultChecked={s.robot_enabled} className="h-5 w-5 accent-[var(--color-acc)]" />
              Robô ligado (publica sozinho)
            </label>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Matérias por dia">
                <input name="posts_per_day" type="number" min={0} max={24} defaultValue={s.posts_per_day} className={inputCls} />
              </Field>
              <Field label="Começa às (h)">
                <input name="robot_start_hour" type="number" min={0} max={23} defaultValue={s.robot_start_hour} className={inputCls} />
              </Field>
              <Field label="Termina às (h)">
                <input name="robot_end_hour" type="number" min={1} max={24} defaultValue={s.robot_end_hour} className={inputCls} />
              </Field>
            </div>
            <p className="text-xs text-muted">
              Horário de Brasília. Com a configuração atual, o intervalo mínimo entre matérias é de {gap} h. O Gemini grátis aguenta folgado até ~20 por dia.
            </p>
            <Field label="Mínimo de palavras" hint="Matéria abaixo disso é reprovada e reescrita (o Anime Profile usa 350).">
              <input name="robot_min_words" type="number" min={200} max={1500} defaultValue={s.robot_min_words} className={`${inputCls} max-w-32`} />
            </Field>
            <fieldset className="flex flex-wrap gap-4">
              <legend className="mb-1.5 font-mono text-xs font-bold uppercase text-body">Editorias que o robô pode usar</legend>
              {ROBOT_SECTIONS.map((sec) => (
                <label key={sec.slug} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="robot_sections"
                    value={sec.slug}
                    defaultChecked={s.robot_sections.includes(sec.slug)}
                    className="accent-[var(--color-acc)]"
                  />
                  {sec.label}
                </label>
              ))}
            </fieldset>
          </div>
        </Card>
        <div>
          <Button tone="primary">Salvar</Button>
        </div>
      </Form>

      <Form method="post" className="flex max-w-2xl flex-col gap-4">
        <input type="hidden" name="intent" value="ads" />
        <Card title="Anúncios (Google AdSense)">
          <div className="flex flex-col gap-4">
            <p className={`font-mono text-xs font-bold ${loaderData.hasClient ? "text-acc" : "text-warn"}`}>ADSENSE_CLIENT: {loaderData.hasClient ? "CONFIGURADO" : "AUSENTE"}</p>
            <label className="flex items-center gap-3 text-paper">
              <input type="checkbox" name="ads_enabled" defaultChecked={loaderData.ads.enabled} className="h-5 w-5 accent-[var(--color-acc)]" />
              Anúncios ligados (blocos manuais)
            </label>
            <p className="-mt-2 text-xs text-muted">Desmarque para tirar todos os anúncios do site na hora.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="No meio da matéria (In-article)" hint="Número em data-ad-slot no código do bloco, no AdSense.">
                <input name="slot_meio" inputMode="numeric" placeholder="ex.: 1234567890" defaultValue={loaderData.ads.slots.meio ?? ""} className={inputCls} />
              </Field>
              <Field label="Faixa entre blocos (Display)">
                <input name="slot_faixa" inputMode="numeric" placeholder="ex.: 1234567890" defaultValue={loaderData.ads.slots.faixa ?? ""} className={inputCls} />
              </Field>
              <Field label="Lateral no PC (Display)">
                <input name="slot_lateral" inputMode="numeric" placeholder="ex.: 1234567890" defaultValue={loaderData.ads.slots.lateral ?? ""} className={inputCls} />
              </Field>
              <Field label="Fim da matéria (Multiplex)">
                <input name="slot_multiplex" inputMode="numeric" placeholder="ex.: 1234567890" defaultValue={loaderData.ads.slots.multiplex ?? ""} className={inputCls} />
              </Field>
            </div>
          </div>
        </Card>
        <div>
          <Button tone="primary">Salvar anúncios</Button>
        </div>
      </Form>

      <AdPreviewControls />
    </>
  );
}

/** Liga ou desliga o modo "ver espaços" (caixas tracejadas no site, só neste navegador, sem chamar o Google). */
function AdPreviewControls() {
  const [on, setOn] = useState<boolean | null>(null);
  useEffect(() => {
    try {
      setOn(localStorage.getItem(AD_PREVIEW_KEY) === "1");
    } catch {
      setOn(false);
    }
  }, []);
  const set = (v: boolean) => {
    try {
      if (v) localStorage.setItem(AD_PREVIEW_KEY, "1");
      else localStorage.removeItem(AD_PREVIEW_KEY);
    } catch {
      /* nada */
    }
    setOn(v);
    if (v) window.open("/", "_blank");
  };
  return (
    <Card title="Ver onde os anúncios vão ficar" className="max-w-2xl">
      <p className="text-sm text-body">Mostra caixas tracejadas com o tamanho de cada anúncio, só neste navegador. Não chama o Google e funciona antes da aprovação.</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button type="button" tone="primary" onClick={() => set(true)}>
          Ver espaços no site
        </Button>
        <Button type="button" onClick={() => set(false)}>
          Desligar
        </Button>
        <span className="font-mono text-xs text-muted">Modo espaços: {on === null ? "…" : on ? "ligado" : "desligado"}</span>
      </div>
    </Card>
  );
}
