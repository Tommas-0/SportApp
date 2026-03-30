import { notFound } from "next/navigation";
import { getTemplateById } from "@/lib/db/templates";
import { getExercises, getGlobalExercises } from "@/lib/db/exercises";
import { CreateTemplateForm } from "@/components/templates/CreateTemplateForm";
import Link from "next/link";

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [template, exercises, globalExercises] = await Promise.all([
    getTemplateById(id),
    getExercises(),
    getGlobalExercises(),
  ]);

  if (!template) notFound();

  return (
    <>
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-blue-900/20 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-purple-900/15 blur-[120px]" />
      </div>
      <div className="relative z-10 space-y-5 max-w-lg mx-auto">
        <div className="flex items-center gap-3">
          <Link href="/templates" className="text-zinc-600 hover:text-zinc-300 transition-colors text-sm">←</Link>
          <div>
            <h1 className="text-lg font-semibold text-white">Éditer le programme</h1>
            <p className="text-xs text-zinc-600 mt-0.5">{template.name}</p>
          </div>
        </div>
        <CreateTemplateForm
          exercises={exercises}
          globalExercises={globalExercises}
          template={template}
          templateExercises={template.template_exercises}
        />
      </div>
    </>
  );
}
