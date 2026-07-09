export function LiquidGlassDefs() {
  return (
    <svg aria-hidden="true" width="0" height="0" style={{ position: "absolute", overflow: "hidden" }}>
      <defs>
        <filter id="kh-liquid-refraction" x="-15%" y="-15%" width="130%" height="130%"
                colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.005 0.008" numOctaves="2" seed="7" result="noise" />
          <feGaussianBlur in="noise" stdDeviation="1.5" result="softNoise" />
          <feDisplacementMap in="SourceGraphic" in2="softNoise" scale="20"
                             xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
  )
}
