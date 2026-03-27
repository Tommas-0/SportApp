import { getExercises } from "@/lib/db/exercises";
import { CreateTemplateForm } from "@/components/templates/CreateTemplateForm";
import Link from "next/link";

export default async function NewTemplatePage() {
  const exercises = await getExercises();

  return (
    <>
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-blue-900/20 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-purple-900/15 blur-[120px]" />
      </div>
      <div className="relative z-10 space-y-5 max-w-lg mx-auto">
        <div className="flex items-center gap-3">
          <Link href="/templates" className="text-zinc-600 hover:text-zinc-300 transition-colors text-sm">←</Link>
          <h1 className="text-lg font-semibold text-white">Nouveau programme</h1>
        </div>
        <CreateTemplateForm exercises={exercises} />
      </div>
    </>
  );
}
