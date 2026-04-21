import type { CSSProperties } from "react"

import { cn } from "@/lib/utils"

type SiteLoaderSize = "sm" | "md" | "lg"

interface SiteLoaderProps {
  className?: string
  color?: string
  size?: SiteLoaderSize
  label?: string
  text?: string
  fullScreen?: boolean
}

const sizeVars: Record<SiteLoaderSize, CSSProperties> = {
  sm: {
    ["--loader-dot-size" as string]: "8px",
    ["--loader-gap" as string]: "6px",
  },
  md: {
    ["--loader-dot-size" as string]: "8px",
    ["--loader-gap" as string]: "6px",
  },
  lg: {
    ["--loader-dot-size" as string]: "8px",
    ["--loader-gap" as string]: "6px",
  },
}

export function SiteLoader({
  className,
  color = "#3453a7",
  size = "md",
  label = "Loading",
  text,
  fullScreen = false,
}: SiteLoaderProps) {
  const style = {
    ...sizeVars[size],
    ["--loader-color" as string]: color,
  } as CSSProperties

  return (
    <div
      className={cn(
        fullScreen && "fixed inset-0 z-[9999] min-h-screen w-full flex items-center justify-center bg-white",
        className,
      )}
    >
      <div
        className="flex flex-col items-center justify-center gap-4 px-6 py-4"
        role="status"
        aria-label={label}
      >
        <div className="site-loader" style={style}>
          {Array.from({ length: 3 }).map((_, index) => (
            <span key={index} className="site-loader__dot" />
          ))}
        </div>
        {text ? <p className="text-sm font-medium text-[#8b7355] text-center">{text}</p> : null}
      </div>
    </div>
  )
}
