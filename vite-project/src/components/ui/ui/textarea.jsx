import * as React from "react"
import { cn } from "@/lib/utils"

function Textarea({ className, ...props }) {
  return (
    <textarea
      className={cn(
        "w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-400 border-purple-200",
        className
      )}
      {...props}
    />
  );
}

export { Textarea }



