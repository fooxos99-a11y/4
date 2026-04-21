import type React from "react"
// هذا الملف يحل المشكلة من الجذور - أي تأثير جديد سيتم تطبيقه تلقائياً على كل الصفحات

export interface CardEffectResult {
  className: string
  style: React.CSSProperties
  extraElements?: React.ReactNode
}

export const applyCardEffect = (effectId: string | undefined | null, cardClass: string): CardEffectResult => {
  if (!effectId || effectId === "none" || effectId === "effect_none" || effectId === "default") {
    return {
      className: cardClass,
      style: {
        background: "transparent",
      },
      extraElements: null,
    }
  }

  const normalizedId = effectId.replace("effect_", "").toLowerCase()

  if (normalizedId === "bats") {
    return {
      className: `${cardClass} overflow-hidden`,
      style: {
        background: "transparent",
      },
      extraElements: (
        <>
          {[
            { top: "10%", left: "20%", size: "44px", delay: "0s", opacity: 0.28, animation: "fly" },
            { bottom: "12%", left: "80%", size: "40px", delay: "0.8s", opacity: 0.28, animation: "fly" },
            { top: "50%", left: "40%", size: "38px", delay: "1.6s", opacity: 0.28, animation: "fly" },
            { top: "50%", left: "60%", size: "42px", delay: "2.4s", opacity: 0.28, animation: "fly" },
          ].map((bat, i) => (
            <div
              key={i}
              className={`absolute z-20 pointer-events-none animate-[fly_3s_ease-in-out_infinite]`}
              style={{
                top: bat.top,
                bottom: bat.bottom,
                left: bat.left,
                fontSize: bat.size,
                animationDelay: bat.delay,
                filter: "grayscale(100%) brightness(0)",
                opacity: bat.opacity,
              }}
            >
              🦇
            </div>
          ))}
        </>
      ),
    }
  }

  if (normalizedId === "fire") {
    return {
      className: `${cardClass} overflow-hidden`,
      style: {
        background: "transparent",
      },
      extraElements: (
        <>
          {[
            { top: "10%", left: "25%", size: "42px", delay: "0s", opacity: 0.28, animation: "flicker" },
            { bottom: "15%", left: "75%", size: "38px", delay: "1s", opacity: 0.28, animation: "flicker" },
            { top: "50%", left: "42%", size: "40px", delay: "2s", opacity: 0.28, animation: "flicker" },
            { top: "50%", left: "58%", size: "44px", delay: "3s", opacity: 0.28, animation: "flicker" },
          ].map((flame, i) => (
            <div
              key={i}
              className={`absolute z-20 pointer-events-none animate-[flicker_2s_ease-in-out_infinite]`}
              style={{
                top: flame.top,
                bottom: flame.bottom,
                left: flame.left,
                fontSize: flame.size,
                animationDelay: flame.delay,
                filter: "hue-rotate(-10deg) saturate(1.2)",
                opacity: flame.opacity,
              }}
            >
              🔥
            </div>
          ))}
        </>
      ),
    }
  }

  if (normalizedId === "snow") {
    return {
      className: `${cardClass} overflow-hidden`,
      style: {
        background: "transparent",
      },
      extraElements: (
        <>
          {[
            { top: "12%", left: "22%", size: "44px", delay: "0s", opacity: 0.28, animation: "float" },
            { bottom: "14%", left: "78%", size: "40px", delay: "1.5s", opacity: 0.28, animation: "float" },
            { top: "50%", left: "40%", size: "42px", delay: "3s", opacity: 0.28, animation: "float" },
            { top: "50%", left: "60%", size: "46px", delay: "4.5s", opacity: 0.28, animation: "float" },
          ].map((snow, i) => (
            <div
              key={i}
              className={`absolute z-20 pointer-events-none animate-[float_3s_ease-in-out_infinite]`}
              style={{
                top: snow.top,
                bottom: snow.bottom,
                left: snow.left,
                fontSize: snow.size,
                animationDelay: snow.delay,
                filter: "brightness(1.1)",
                opacity: snow.opacity,
              }}
            >
              ❄️
            </div>
          ))}
        </>
      ),
    }
  }

  if (normalizedId === "leaves") {
    return {
      className: `${cardClass} overflow-hidden`,
      style: {
        background: "transparent",
      },
      extraElements: (
        <>
          {[
            { top: "10%", left: "18%", size: "45px", delay: "0s", opacity: 0.28, animation: "wave" },
            { bottom: "12%", left: "82%", size: "42px", delay: "1.2s", opacity: 0.28, animation: "wave" },
            { top: "50%", left: "42%", size: "44px", delay: "2.4s", opacity: 0.28, animation: "wave" },
            { top: "50%", left: "58%", size: "48px", delay: "3.6s", opacity: 0.28, animation: "wave" },
          ].map((leaf, i) => (
            <div
              key={i}
              className={`absolute z-20 pointer-events-none animate-[wave_2.5s_ease-in-out_infinite]`}
              style={{
                top: leaf.top,
                bottom: leaf.bottom,
                left: leaf.left,
                fontSize: leaf.size,
                animationDelay: leaf.delay,
                filter: "hue-rotate(0deg) saturate(1.3)",
                opacity: leaf.opacity,
              }}
            >
              🍃
            </div>
          ))}
        </>
      ),
    }
  }

  if (normalizedId === "royal") {
    return {
      className: `${cardClass} overflow-hidden`,
      style: {
        background: "transparent",
      },
      extraElements: (
        <>
          {[
            { top: "9%", left: "16%", size: "46px", delay: "0s", opacity: 0.28, animation: "bounce" },
            { bottom: "11%", left: "84%", size: "44px", delay: "1.2s", opacity: 0.28, animation: "bounce" },
            { top: "50%", left: "40%", size: "42px", delay: "2.4s", opacity: 0.28, animation: "bounce" },
            { top: "50%", left: "60%", size: "48px", delay: "3.6s", opacity: 0.28, animation: "bounce" },
          ].map((crown, i) => (
            <div
              key={i}
              className={`absolute z-20 pointer-events-none animate-[bounce_2s_ease-in-out_infinite]`}
              style={{
                top: crown.top,
                bottom: crown.bottom,
                left: crown.left,
                fontSize: crown.size,
                animationDelay: crown.delay,
                filter: "drop-shadow(0 2px 8px rgba(168, 85, 247, 0.5))",
                opacity: crown.opacity,
              }}
            >
              👑
            </div>
          ))}
        </>
      ),
    }
  }

  return {
    className: cardClass,
    style: {
      background: "transparent",
    },
    extraElements: null,
  }
}
