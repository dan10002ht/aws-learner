"use client";

import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "success" | "danger";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "md" | "sm";
}

const Button3D = forwardRef<HTMLButtonElement, Props>(function Button3D(
  { variant = "primary", size = "md", className = "", children, ...rest },
  ref
) {
  const v = `btn3d-${variant}`;
  const s = size === "sm" ? "btn3d-sm" : "";
  return (
    <button ref={ref} className={`btn3d ${v} ${s} ${className}`.trim()} {...rest}>
      {children}
    </button>
  );
});

export default Button3D;
