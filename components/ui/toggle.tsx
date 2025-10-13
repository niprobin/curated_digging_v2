"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface ToggleProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  pressed?: boolean;
  onPressedChange?: (pressed: boolean) => void;
}

export const Toggle = React.forwardRef<HTMLButtonElement, ToggleProps>(
  ({ className, pressed, onPressedChange, type = "button", onClick, ...props }, ref) => {
    const isControlled = typeof pressed === "boolean";
    const [internal, setInternal] = React.useState(false);
    const isPressed = isControlled ? pressed : internal;

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(event);
      if (event.defaultPrevented) return;
      if (!isControlled) {
        setInternal((prev) => !prev);
      }
      onPressedChange?.(!isPressed);
    };

    return (
      <button
        ref={ref}
        type={type}
        aria-pressed={isPressed}
        onClick={handleClick}
        className={cn(
          "inline-flex h-9 items-center justify-center rounded-md border border-input bg-transparent px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          isPressed ? "bg-accent text-accent-foreground" : "hover:bg-accent hover:text-accent-foreground",
          className,
        )}
        {...props}
      />
    );
  },
);

Toggle.displayName = "Toggle";
