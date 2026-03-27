import { type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost" | "success";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:   "bg-orange-600 hover:bg-orange-500 text-white",
  secondary: "bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white",
  danger:    "bg-red-600 hover:bg-red-500 text-white",
  ghost:     "hover:bg-zinc-800 text-zinc-400 hover:text-white",
  success:   "bg-orange-600 hover:bg-orange-500 text-white",
};

const sizes: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2.5 text-sm",
  lg: "px-6 py-3.5 text-base",
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  disabled,
  children,
  className = "",
  ...props
}: Props) {
  return (
    <button
      disabled={disabled || loading}
      className={[
        "rounded-xl font-medium transition-colors",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "flex items-center justify-center gap-2",
        variants[variant],
        sizes[size],
        fullWidth ? "w-full" : "",
        className,
      ].join(" ")}
      {...props}
    >
      {loading && (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  );
}
