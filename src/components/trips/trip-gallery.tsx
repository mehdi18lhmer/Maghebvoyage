"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export function TripGallery({ images, title }: { images: string[]; title: string }) {
  const [active, setActive] = useState(0);

  return (
    <div className="space-y-2">
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl bg-muted">
        <Image
          src={images[active]}
          alt={title}
          fill
          priority
          sizes="(min-width: 1024px) 60vw, 100vw"
          className="object-cover"
        />
      </div>
      {images.length > 1 && (
        <div className="flex gap-2">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setActive(i)}
              className={cn(
                "relative h-16 w-24 shrink-0 overflow-hidden rounded-lg ring-offset-2 transition",
                active === i ? "ring-2 ring-primary" : "opacity-70 hover:opacity-100"
              )}
            >
              <Image src={src} alt="" fill sizes="96px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
