import { getTemplates } from "@/lib/db/templates";
import Link from "next/link";
import { FreeSessionButton } from "@/components/sessions/FreeSessionButton";
import { StartTemplateButton } from "@/components/sessions/StartTemplateButton";
import { DeleteTemplateButton } from "@/components/templates/DeleteTemplateButton";

export default async function TemplatesPage() {
  const templates = await getTemplates();

  return (
    <>
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-blue-900/20 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-purple-900/15 blur-[120px]" />
      </div>

      <div className="relative z-10 space-y-5 max-w-lg mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-white">Programmes</h1>
        <Link
          href="/templates/new"
          className="text-xs text-zinc-300 hover:text-white border border-zinc-700 hover:border-zinc-500 rounded-lg px-3 py-1.5 transition-colors"
        >
          + Nouveau
        </Link>
      </div>

      {/* Séance libre */}
      <FreeSessionButton />

      {/* Liste */}
      {templates.length === 0 ? (
        <div className="border border-dashed border-zinc-800 rounded-2xl py-16 text-center">
          <p className="text-zinc-600 text-sm mb-4">Aucun programme pour l&apos;instant.</p>
          <Link
            href="/templates/new"
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            Créer mon premier programme →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {templates.map((template) => {
            const exerciseCount = (template.template_exercises ?? []).length;
            return (
              <div
                key={template.id}
                className="border border-zinc-800 bg-zinc-900/60 rounded-xl overflow-hidden"
              >
                {/* Infos */}
                <div className="px-4 pt-4 pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-white text-sm truncate">{template.name}</p>
                      {template.description && (
                        <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{template.description}</p>
                      )}
                    </div>
                    {exerciseCount > 0 && (
                      <span className="shrink-0 text-[11px] text-zinc-600 bg-zinc-800 rounded-md px-2 py-0.5">
                        {exerciseCount} ex.
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="border-t border-zinc-800/80 grid grid-cols-3 divide-x divide-zinc-800/80">
                  <StartTemplateButton templateId={template.id} />
                  <Link href={`/templates/${template.id}`}>
                    <button className="w-full py-2.5 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800/60 transition-colors">
                      Éditer
                    </button>
                  </Link>
                  <DeleteTemplateButton id={template.id} name={template.name} />
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>
    </>
  );
}
