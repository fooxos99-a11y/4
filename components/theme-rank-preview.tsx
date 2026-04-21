type ThemeRankPreviewProps = {
  primary: string
  secondary: string
  tertiary: string
  premium?: boolean
  circleAlign?: "start" | "end"
}

export function ThemeRankPreview({
  primary,
  secondary,
  tertiary,
  premium = false,
  circleAlign = "end",
}: ThemeRankPreviewProps) {
  return (
    <div
      className="group relative w-full overflow-hidden rounded-2xl border-2 shadow-lg sm:rounded-3xl"
      style={{
        backgroundColor: premium ? "rgba(250, 248, 245, 0.98)" : "rgba(255, 255, 255, 0.95)",
        borderColor: primary,
        borderWidth: premium ? "3px" : "2px",
        backgroundImage: premium
          ? `linear-gradient(90deg, ${primary}08 1px, transparent 1px), linear-gradient(${primary}08 1px, transparent 1px), radial-gradient(circle at 10% 20%, ${primary}05 0%, transparent 50%)`
          : `radial-gradient(circle at 20% 80%, ${primary}08 0%, transparent 50%), radial-gradient(circle at 80% 20%, ${secondary}06 0%, transparent 50%)`,
        backgroundSize: premium ? "20px 20px, 20px 20px, 100% 100%" : undefined,
      }}
    >
      <div
        className="absolute top-0 left-0 w-full h-1.5"
        style={{
          backgroundImage: premium
            ? `linear-gradient(to right, ${primary}, ${secondary}, ${primary})`
            : `linear-gradient(to right, ${primary}, ${secondary})`,
        }}
      />

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-8 top-5 h-28 w-28 rounded-full blur-3xl" style={{ backgroundColor: `${primary}22` }} />
        <div className="absolute -left-10 bottom-0 h-24 w-24 rounded-full blur-3xl" style={{ backgroundColor: `${secondary}18` }} />
      </div>

      <div className="relative z-10 p-1.5 sm:p-2 md:p-2.5">
        <div
          className="rounded-[20px] border shadow-[0_18px_40px_-24px_rgba(0,0,0,0.18)] backdrop-blur sm:rounded-[24px]"
          style={{
            borderColor: `${primary}28`,
            background: premium
              ? `linear-gradient(135deg, rgba(255,255,255,0.72), ${primary}08, rgba(255,255,255,0.82))`
              : `linear-gradient(135deg, rgba(255,255,255,0.74), ${primary}05, ${secondary}07)`,
          }}
        >
          <div className="relative h-[66px] px-2.5 sm:h-[76px] sm:px-3 md:h-[88px] md:px-4">
            <div className={`absolute inset-y-0 flex items-center ${circleAlign === "end" ? "right-[0.8rem] sm:right-[0.95rem] md:right-[1.1rem]" : "left-[0.8rem] sm:left-[0.95rem] md:left-[1.1rem]"}`}>
              <div
                className="leaderboard-rank-bob relative flex h-9 w-9 items-center justify-center rounded-full border shadow-[0_12px_28px_-18px_rgba(0,0,0,0.35)] transition-transform duration-300 group-hover:scale-105 md:h-10 md:w-10"
                style={{
                  background: `radial-gradient(circle at 30% 30%, ${secondary}, ${primary})`,
                  borderColor: `${tertiary}66`,
                }}
              >
                <div className="absolute inset-[3px] rounded-full border border-white/25" />
                <div className="absolute h-2 w-2 rounded-full bg-white/30 top-2 right-2" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
