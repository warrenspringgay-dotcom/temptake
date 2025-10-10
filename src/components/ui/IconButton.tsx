import * as React from "react";
import { clsx } from "clsx";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement>;

export default function IconButton({ className, ...props }: Props) {
  return (
    <button
      {...props}
      className={clsx(
        "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50",
        className
      )}
    />
  );
}
