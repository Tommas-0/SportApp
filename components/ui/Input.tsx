import { type InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

export function Input({ label, error, id, className = "", ...props }: Props) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-sm text-zinc-400">
          {label}
        </label>
      )}
      <input
        id={id}
        className={[
          "bg-zinc-900 border rounded-xl px-4 py-2.5 text-white",
          "placeholder-zinc-600 focus:outline-none transition-colors",
          error
            ? "border-red-500 focus:border-red-400"
            : "border-zinc-700 focus:border-blue-500",
          className,
        ].join(" ")}
        {...props}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

export function Textarea({
  label,
  error,
  id,
  className = "",
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-sm text-zinc-400">
          {label}
        </label>
      )}
      <textarea
        id={id}
        rows={3}
        className={[
          "bg-zinc-900 border rounded-xl px-4 py-2.5 text-white resize-none",
          "placeholder-zinc-600 focus:outline-none transition-colors",
          error
            ? "border-red-500 focus:border-red-400"
            : "border-zinc-700 focus:border-blue-500",
          className,
        ].join(" ")}
        {...props}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
