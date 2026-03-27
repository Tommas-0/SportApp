# Exemples d'utilisation

## Server Component — lire des données

```tsx
// app/(app)/templates/page.tsx
import { getTemplates } from "@/lib/db/templates";

export default async function TemplatesPage() {
  const templates = await getTemplates(); // appel direct, pas de Server Action

  return (
    <ul>
      {templates.map((t) => (
        <li key={t.id}>{t.name}</li>
      ))}
    </ul>
  );
}
```

## Client Component — créer un template

```tsx
"use client";
import { createTemplateAction } from "@/app/actions/templates";

export function CreateTemplateForm() {
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const result = await createTemplateAction({
      name: "Push Day",
      description: "Pectoraux / épaules / triceps",
      exercises: [
        { exercise_id: "uuid-...", order_index: 0, default_sets: 4, default_reps: 8 },
        { exercise_id: "uuid-...", order_index: 1, default_sets: 3, default_reps: 12 },
      ],
    });

    if (!result.success) {
      console.error(result.error);
      return;
    }
    console.log("Template créé :", result.data.id);
  }

  return <form onSubmit={handleSubmit}>...</form>;
}
```

## Client Component — lancer une séance

```tsx
"use client";
import { startSessionAction } from "@/app/actions/sessions";

export function StartSessionButton({ templateId }: { templateId: string }) {
  return (
    <form action={startSessionAction.bind(null, templateId)}>
      <button type="submit">Lancer la séance</button>
    </form>
  );
  // → redirige automatiquement vers /sessions/active?id=...
}
```

## Client Component — enregistrer une série

```tsx
"use client";
import { logSetAction } from "@/app/actions/sets";

export function LogSetButton({ sessionId, exerciseId, setNumber }: {
  sessionId: string;
  exerciseId: string;
  setNumber: number;
}) {
  async function handleLog() {
    const result = await logSetAction({
      session_id: sessionId,
      exercise_id: exerciseId,
      set_number: setNumber,
      reps: 10,
      weight_kg: 80,
      rpe: 8,
      is_warmup: false,
    });

    if (!result.success) {
      console.error(result.error);
      return;
    }
    console.log("Série enregistrée :", result.data);
  }

  return <button onClick={handleLog}>Valider la série</button>;
}
```

## Client Component — terminer une séance

```tsx
"use client";
import { endSessionAction } from "@/app/actions/sessions";

export function EndSessionButton({ sessionId }: { sessionId: string }) {
  async function handleEnd() {
    const result = await endSessionAction(sessionId, "Bonne séance !");
    if (result.success) {
      window.location.href = `/sessions/${sessionId}`;
    }
  }

  return <button onClick={handleEnd}>Terminer la séance</button>;
}
```
