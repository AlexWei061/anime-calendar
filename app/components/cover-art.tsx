import type { CSSProperties } from "react";
import type { Anime } from "../types";
import { coverSpriteFor } from "../../data/cover-sprites.js";

export function CoverArt({
  anime,
  className,
  decorative = false,
  variant = "thumbnail",
}: {
  anime: Anime;
  className: string;
  decorative?: boolean;
  variant?: "thumbnail" | "detail";
}) {
  const sprite = coverSpriteFor(anime.coverUrl, variant);
  if (!sprite) return null;

  const style = {
    backgroundImage: `url(${sprite.url})`,
    backgroundSize: `${sprite.columns * 100}% ${sprite.rows * 100}%`,
    backgroundPosition: `${sprite.columns === 1 ? 0 : (sprite.x / (sprite.columns - 1)) * 100}% ${sprite.rows === 1 ? 0 : (sprite.y / (sprite.rows - 1)) * 100
      }%`,
  } as CSSProperties;

  return (
    <span
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : anime.coverAlt}
      className={className + " cover-sprite"}
      role={decorative ? undefined : "img"}
      style={style}
    />
  );
}
