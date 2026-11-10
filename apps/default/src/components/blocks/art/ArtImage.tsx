'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

/** A generated art file: `src` is a data URI, the rest describe it. */
export interface ArtModule {
  src: string;
  width: number;
  height: number;
  alt: string;
}

export interface ArtImageProps {
  /** DATA IN: the module of one file in `src/assets/art/`, for example `import * as hero from '@/assets/art/hero'`. */
  art: ArtModule;
  className?: string;
  style?: React.CSSProperties;
  /** Set true for a photo. A photo keeps its own light and takes no filter. Default false. */
  photo?: boolean;
}

/*
 * The art is black ink on a white paper. The SVG filter turns the paper into
 * real alpha, so the image has no tile. Three details make it hold:
 * - the filter region is the whole image (x 0, y 0, width 1, height 1),
 *   because the default 10 percent margin turns opaque white after the invert,
 * - the composite with SourceAlpha keeps the border pixels clear,
 * - mix-blend-mode is not used, because it fails inside a stacking context.
 * In dark mode the ink inverts and the accent keeps its hue.
 */
const FILTER_VALUES = '1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  -0.9 -1.77 -0.33 0 3';

export function ArtImage({ art, className, style, photo = false }: ArtImageProps) {
  const filterId = `art-paper-${React.useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const cssVars = { '--art-filter': `url("#${filterId}")` } as React.CSSProperties;

  if (photo) {
    return (
      <img
        src={art.src}
        alt={art.alt}
        width={art.width}
        height={art.height}
        loading="lazy"
        decoding="async"
        className={cn('object-cover', className)}
        style={style}
      />
    );
  }

  return (
    <>
      <style>{`.art-line{filter:var(--art-filter)}.dark .art-line{filter:var(--art-filter) invert(1) hue-rotate(180deg) saturate(1.25) brightness(1.3)}`}</style>
      <svg
        aria-hidden="true"
        focusable="false"
        width={0}
        height={0}
        style={{ position: 'absolute' }}
      >
        <filter id={filterId} x={0} y={0} width={1} height={1} colorInterpolationFilters="sRGB">
          <feColorMatrix type="matrix" result="m" values={FILTER_VALUES} />
          <feComposite in="m" in2="SourceAlpha" operator="in" />
        </filter>
      </svg>
      <img
        src={art.src}
        alt={art.alt}
        width={art.width}
        height={art.height}
        loading="lazy"
        decoding="async"
        className={cn('art-line object-contain', className)}
        style={{ ...cssVars, ...style }}
      />
    </>
  );
}
