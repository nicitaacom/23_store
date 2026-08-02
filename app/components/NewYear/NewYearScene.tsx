"use client"

import { useEffect, useRef } from "react"

import { motion, useReducedMotion } from "framer-motion"
import gsap from "gsap"

import { useSiteTheme } from "@/hooks/ui/useSiteTheme"

interface Snowflake {
  x: number
  y: number
  radius: number
  sway: number
  phase: number
}

interface SnowLayer {
  flakes: Snowflake[]
  fall: number
  windScale: number
  opacity: number
  halo: boolean
}

/* Three depths. `fall` is normalised height per millisecond, so a near flake crosses the
   viewport in about 9s and a far one in about 22s regardless of how tall the window is */
const LAYER_SPECS = [
  { count: 60, minRadius: 0.6, spread: 0.5, fall: 0.0000455, windScale: 0.35, opacity: 0.5, halo: false },
  { count: 42, minRadius: 1, spread: 0.7, fall: 0.0000714, windScale: 0.62, opacity: 0.72, halo: false },
  { count: 22, minRadius: 1.6, spread: 1, fall: 0.000111, windScale: 1, opacity: 0.95, halo: true },
]

/* The fall runs 0 at the top of the viewport to 1 at the bottom. A flake eases in over the
   first slice of that and dissolves through the last, so it is already at zero opacity both
   where it is created and where it is recycled. That is what keeps one flake's life from
   reading as a clip that restarts: nothing is ever seen appearing or being moved */
const FADE_IN_BAND = 0.06
/* The flake is gone by here rather than at the bottom edge, so the last of it goes out while it
   is still on screen. Fading right up to the edge hides the whole effect behind whatever the
   page happens to be drawing down there */
const FADE_OUT_END = 0.94
/* Thinning starts this far above that point — a little under halfway down the fall, so the
   snow visibly loses weight as it descends rather than holding full strength and cutting out */
const FADE_OUT_BAND = 0.5
/* Above 1 the fall-off is weighted towards the end, so a flake dims slowly at first and then
   drops away quickly near the bottom. A straight ramp reads as a uniform dimming of the whole
   field instead of individual flakes settling out */
const FADE_OUT_CURVE = 1.6

/* A damped pendulum: each swing overshoots less than the one before it. Matches the set
   NewYearProjectOrnament swings its bauble through, so both read as the same weight of glass */
const SWING_KEYFRAMES = [0, 9, -7, 5, -3, 1.6, 0]

/* Points sampled off the catenary the bulb string hangs on, from M60 440 Q720 600 1380 440.
   The x values are evenly spaced because the quadratic's three x controls are, so only y needs
   the curve: 440 + 320t(1-t) */
const BULBS = [
  { x: 166, y: 464 },
  { x: 304, y: 488 },
  { x: 443, y: 506 },
  { x: 581, y: 517 },
  { x: 720, y: 520 },
  { x: 859, y: 517 },
  { x: 997, y: 506 },
  { x: 1136, y: 488 },
  { x: 1274, y: 464 },
]

function isAmbientMotionPaused(reducedMotion: boolean | null) {
  return Boolean(reducedMotion) || document.hidden || document.body.classList.contains("modal-open")
}

/* Three stacked balls on a drift, a crimson scarf and a top hat. Local origin is the centre of
   the bottom ball, so placing one is a matter of putting that point on the snow line */
function Snowman({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <ellipse cx="0" cy="50" rx="74" ry="13" fill="#b9b2a2" fillOpacity="0.4" />

      <ellipse cx="0" cy="0" rx="62" ry="58" fill="#fbf8f2" stroke="#d9d2c3" strokeOpacity="0.55" strokeWidth="2" />
      <ellipse cx="0" cy="-84" rx="45" ry="42" fill="#fdfbf6" stroke="#d9d2c3" strokeOpacity="0.55" strokeWidth="2" />
      <ellipse cx="0" cy="-148" rx="32" ry="31" fill="#fffdfa" stroke="#d9d2c3" strokeOpacity="0.5" strokeWidth="2" />

      {/* Twig arms */}
      <path
        d="M-44 -92L-98 -118M-98 -118L-116 -126M-98 -118L-102 -100M44 -92L98 -116M98 -116L116 -124M98 -116L102 -98"
        stroke="#6b4a2a"
        strokeWidth="5"
        strokeLinecap="round"
      />

      {/* Scarf over the neck, with a tail hanging down the front */}
      <path d="M-41 -119Q0 -104 41 -119L41 -106Q0 -91 -41 -106Z" fill="#c81a30" />
      <path d="M27 -111L47 -64L29 -59L15 -105Z" fill="#a9142a" />

      <circle cx="-11" cy="-154" r="4.4" fill="#23190f" />
      <circle cx="11" cy="-154" r="4.4" fill="#23190f" />
      <path d="M3 -147L27 -141L3 -136Z" fill="#e07a29" />
      <g fill="#23190f">
        <circle cx="-13" cy="-137" r="2" />
        <circle cx="-6.5" cy="-133" r="2" />
        <circle cx="0" cy="-132" r="2" />
        <circle cx="6.5" cy="-133" r="2" />
        <circle cx="13" cy="-137" r="2" />
        <circle cx="0" cy="-98" r="4.6" />
        <circle cx="0" cy="-80" r="4.6" />
        <circle cx="0" cy="-62" r="4.6" />
      </g>

      {/* Top hat, straight off the snowman reference */}
      <path d="M-25 -178V-214H25V-178Z" fill="#1b2a23" />
      <path d="M-25 -186H25V-178H-25Z" fill="#c81a30" />
      <path d="M-41 -179H41V-171H-41Z" fill="#1b2a23" />
    </g>
  )
}

/* A snow-laden fir standing on the drift */
function SnowFir({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <rect x="-8" y="-10" width="16" height="34" fill="#5a3a22" />
      <path d="M0 -196L54 -108H-54Z" fill="#1d5c40" />
      <path d="M0 -152L68 -52H-68Z" fill="#194f37" />
      <path d="M0 -104L82 10H-82Z" fill="#123d2c" />
      <g stroke="#fdfbf6" strokeWidth="7" strokeLinecap="round" fill="none" strokeOpacity="0.92">
        <path d="M-54 -108Q0 -120 54 -108" />
        <path d="M-68 -52Q0 -66 68 -52" />
        <path d="M-82 10Q0 -6 82 10" />
      </g>
      <circle cx="0" cy="-196" r="7" fill="#fffdfa" />
    </g>
  )
}

/* The cottage from the outdoor-lighting reference: cream walls, a thick snow roof, warm windows
   and a string of bulbs run along the eaves and up the rake. Local origin is the middle of its
   base, on the snow line */
function SnowHouse({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  /* Bulbs along the eaves, then up both roof edges towards the ridge */
  const eaveBulbs = Array.from({ length: 9 }, (_, index) => ({ x: -120 + index * 30, y: -116 }))
  const rakeBulbs = Array.from({ length: 4 }, (_, index) => [
    { x: -118 + index * 29, y: -124 - index * 19 },
    { x: 118 - index * 29, y: -124 - index * 19 },
  ]).flat()

  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <ellipse cx="0" cy="4" rx="150" ry="16" fill="#b9b2a2" fillOpacity="0.35" />

      {/* Walls */}
      <path d="M-112 0V-118H112V0Z" fill="#e6ddcb" />
      <path d="M-112 0V-118H-84V0Z" fill="#d4cab6" />

      {/* Roof, then the snow sitting on it */}
      <path d="M-132 -116L0 -206L132 -116Z" fill="#5d3f2c" />
      <path d="M-132 -116L0 -206L132 -116L132 -108L0 -196L-132 -108Z" fill="#fffdfa" />
      <path d="M-132 -110Q-66 -122 0 -108Q66 -122 132 -110L132 -100Q66 -112 0 -98Q-66 -112 -132 -100Z" fill="#fdfbf6" />

      {/* Chimney with its own cap of snow. The roof's right slope passes under x 56-86 at
          y -167.8 to -147.4 (0deg slope from the -206 ridge to the -116 eave); the bottom edge
          sits at -140, past both, so the base is seated in the roof with no gap showing through */}
      <path d="M56 -140V-214H86V-140Z" fill="#7d5238" />
      <path d="M54 -214H88V-206H54Z" fill="#fffdfa" />

      {/* Warm windows with muntins */}
      <g>
        <rect x="-84" y="-92" width="46" height="42" rx="4" fill="#f7b23b" fillOpacity="0.9" />
        <path d="M-61 -92V-50M-84 -71H-38" stroke="#5d3f2c" strokeWidth="4" />
        <rect x="38" y="-92" width="46" height="42" rx="4" fill="#f7b23b" fillOpacity="0.78" />
        <path d="M61 -92V-50M38 -71H84" stroke="#5d3f2c" strokeWidth="4" />
      </g>

      {/* Door with a wreath */}
      <path d="M-22 0V-76H22V0Z" fill="#8b0f1f" />
      <circle cx="0" cy="-52" r="13" fill="none" stroke="#1d5c40" strokeWidth="6" />
      <circle cx="0" cy="-39" r="4" fill="#c81a30" />

      {/* Outdoor lighting: the cord follows the eaves and the rake, bulbs hang off it */}
      <path
        d="M-120 -116H120M-118 -124L0 -200L118 -124"
        stroke="#d9c397"
        strokeOpacity="0.6"
        strokeWidth="2.4"
        fill="none"
      />
      {[...eaveBulbs, ...rakeBulbs].map(bulb => (
        <g key={`${bulb.x}-${bulb.y}`}>
          <circle
            data-new-year-bokeh
            cx={bulb.x}
            cy={bulb.y + 7}
            r="11"
            fill="#f7b23b"
            opacity="0.3"
            filter="url(#new-year-bokeh-blur)"
          />
          <circle data-new-year-bulb cx={bulb.x} cy={bulb.y + 7} r="4" fill="#ffd489" opacity="0.9" />
        </g>
      ))}

      {/* Snow banked against the walls */}
      <path d="M-150 4Q-80 -12 0 0Q80 -12 150 4L150 18H-150Z" fill="#fbf8f2" />
    </g>
  )
}

function createLayers(): SnowLayer[] {
  return LAYER_SPECS.map(spec => ({
    fall: spec.fall,
    windScale: spec.windScale,
    opacity: spec.opacity,
    halo: spec.halo,
    flakes: Array.from({ length: spec.count }, () => ({
      x: Math.random(),
      y: Math.random(),
      radius: spec.minRadius + Math.random() * spec.spread,
      sway: 0.004 + Math.random() * 0.008,
      phase: Math.random() * Math.PI * 2,
    })),
  }))
}

// http://localhost:6006/?path=/story/foundations-design-tokens--colors
export function NewYearScene() {
  const theme = useSiteTheme()
  const reducedMotion = useReducedMotion()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<HTMLDivElement>(null)
  /* The flakes outlive the effect that draws them. Built inside it, every re-run would hand out
     a fresh set of random positions and the whole field would jump at once — which is what any
     change to reducedMotion or theme did, and what Fast Refresh does on every edit to this file
     while the page is open. Held here, the snow keeps falling from wherever it had reached */
  const layersRef = useRef<SnowLayer[] | null>(null)

  useEffect(() => {
    if (theme !== "new-year") return

    const canvas = canvasRef.current
    if (!canvas) return

    const context = canvas.getContext("2d")
    if (!context) return

    let width = 0
    let height = 0
    let animationFrame = 0
    let lastFrameTime = performance.now()
    let isRunning = false

    layersRef.current ??= createLayers()
    const layers = layersRef.current

    const resizeCanvas = () => {
      const bounds = canvas.getBoundingClientRect()
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5)
      width = Math.max(1, bounds.width)
      height = Math.max(1, bounds.height)
      canvas.width = Math.round(width * pixelRatio)
      canvas.height = Math.round(height * pixelRatio)
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
    }

    /* Two sine terms of different periods, so the gust never settles into one repeating
       slant — that is what makes it read as weather instead of a scrolling tile */
    const windAt = (time: number) => Math.sin(time * 0.00012) * 0.6 + Math.sin(time * 0.00037 + 1.7) * 0.28

    const drawSnow = (time: number, elapsed: number) => {
      const wind = windAt(time)
      context.clearRect(0, 0, width, height)

      layers.forEach(layer => {
        const lateral = wind * layer.windScale * 0.00004 * elapsed

        layer.flakes.forEach(flake => {
          flake.y += layer.fall * elapsed
          flake.x += lateral

          /* Sent back to the very top, where the fade below is holding it at zero opacity, so
             it is never seen being moved. The old reset dropped it just above the frame at full
             opacity and let it slide into view, which is the jump that made the whole field
             read as one clip playing over again. A fresh sway phase on the way round stops the
             same flake from tracing its own path a second time */
          if (flake.y >= 1) {
            flake.y = 0
            flake.x = Math.random()
            flake.phase = Math.random() * Math.PI * 2
          }
          if (flake.x < -0.06) flake.x += 1.12
          if (flake.x > 1.06) flake.x -= 1.12

          /* Full strength down to a little under halfway, then thinning away to nothing before
             the bottom edge, so the snow settles out of sight instead of stopping at a line */
          const settling = Math.min(1, Math.max(0, (FADE_OUT_END - flake.y) / FADE_OUT_BAND))
          const fade = Math.min(1, flake.y / FADE_IN_BAND) * Math.pow(settling, FADE_OUT_CURVE)
          if (fade <= 0) return

          const px = (flake.x + Math.sin(time * 0.0009 + flake.phase) * flake.sway) * width
          const py = flake.y * height

          if (layer.halo) {
            context.beginPath()
            context.arc(px, py, flake.radius * 2.6, 0, Math.PI * 2)
            context.fillStyle = `rgba(255, 253, 250, ${layer.opacity * fade * 0.16})`
            context.fill()
          }

          context.beginPath()
          context.arc(px, py, flake.radius, 0, Math.PI * 2)
          context.fillStyle = `rgba(255, 253, 250, ${layer.opacity * fade})`
          context.fill()
        })
      })
    }

    const drawFrame = (time: number) => {
      if (!isRunning) return

      const elapsed = Math.min(time - lastFrameTime, 40)
      lastFrameTime = time
      drawSnow(time, elapsed)
      animationFrame = requestAnimationFrame(drawFrame)
    }

    const startCanvas = () => {
      if (isRunning || isAmbientMotionPaused(reducedMotion)) return
      isRunning = true
      lastFrameTime = performance.now()
      animationFrame = requestAnimationFrame(drawFrame)
    }

    const stopCanvas = () => {
      isRunning = false
      cancelAnimationFrame(animationFrame)
    }

    const syncCanvasState = () => {
      if (isAmbientMotionPaused(reducedMotion)) {
        stopCanvas()
        /* One still frame, so a paused or reduced-motion visitor still sees snow in the air
           rather than an empty canvas */
        drawSnow(performance.now(), 0)
      } else startCanvas()
    }

    const handleResize = () => {
      resizeCanvas()
      if (!isRunning) drawSnow(performance.now(), 0)
    }

    resizeCanvas()
    syncCanvasState()

    const resizeObserver = new ResizeObserver(handleResize)
    const bodyObserver = new MutationObserver(syncCanvasState)
    resizeObserver.observe(canvas)
    bodyObserver.observe(document.body, { attributeFilter: ["class"], attributes: true })
    document.addEventListener("visibilitychange", syncCanvasState)

    return () => {
      stopCanvas()
      resizeObserver.disconnect()
      bodyObserver.disconnect()
      document.removeEventListener("visibilitychange", syncCanvasState)
    }
  }, [reducedMotion, theme])

  useEffect(() => {
    const sceneElement = sceneRef.current
    if (theme !== "new-year" || !sceneElement) return

    const animationContext = gsap.context(() => {
      if (reducedMotion) {
        gsap.set("[data-new-year-bauble]", { rotation: 0 })
        gsap.set("[data-new-year-steam]", { y: 0, opacity: 0.4 })
        gsap.set("[data-new-year-bokeh]", { opacity: 0.3 })
        return
      }

      gsap.to("[data-new-year-steam]", {
        y: -14,
        opacity: 0.1,
        duration: 2.4,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
        stagger: { each: 0.5, from: "random" },
      })
      gsap.to("[data-new-year-bokeh]", {
        opacity: 0.46,
        scale: 1.12,
        transformOrigin: "50% 50%",
        duration: 2.9,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
        stagger: { each: 0.31, from: "random" },
      })
      gsap.to("[data-new-year-bulb]", {
        opacity: 0.55,
        duration: 1.7,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
        stagger: { each: 0.23, from: "random" },
      })
      gsap.to("[data-new-year-window-pool]", {
        opacity: 0.74,
        duration: 4.3,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      })
    }, sceneRef)

    const syncTimelineState = () => {
      const shouldPause = document.hidden || document.body.classList.contains("modal-open")
      const sceneTweens = animationContext.getTweens() as gsap.core.Tween[]
      sceneTweens.forEach(tween => tween.paused(shouldPause))
    }

    const bodyObserver = new MutationObserver(syncTimelineState)
    bodyObserver.observe(document.body, { attributeFilter: ["class"], attributes: true })
    document.addEventListener("visibilitychange", syncTimelineState)
    syncTimelineState()

    return () => {
      bodyObserver.disconnect()
      document.removeEventListener("visibilitychange", syncTimelineState)
      animationContext.revert()
    }
  }, [reducedMotion, theme])

  /* The window-head baubles swing when the pointer crosses one rather than idling forever,
     matching NewYearProjectOrnament's convention — a page that never gets a pointer near them
     costs nothing at rest.

     The crossing is measured against the balls' own geometry instead of being read from an
     onPointerEnter, because a listener on these never fires. The scene is inside the fixed
     z-index 0 backdrop, while the whole site's content sits in the single `.relative.z-10` div
     that app/[locale]/layout.tsx puts around Navbar, NewYearJazzPlayer and Layout. That div's
     box spans the viewport at the default pointer-events: auto, so wherever page content leaves
     a gap for the backdrop to show through, it still takes the hit and nothing reaches the
     circle. Letting the event through would mean setting it, Layout, Footer and the modal shell
     every project modal shares to pointer-events: none, then re-opting-in every real control
     site-wide — a lot of blast radius for a decorative swing. Comparing coordinates gets the
     same result without leaving this file.

     The trade-off is that the swing also fires when opaque content covers a bauble, where it is
     hidden anyway — it is never wrong on screen, only sometimes wasted. */
  useEffect(() => {
    const sceneElement = sceneRef.current
    if (theme !== "new-year" || reducedMotion || !sceneElement) return

    const baubles = Array.from(sceneElement.querySelectorAll<SVGGElement>("[data-new-year-bauble]")).flatMap(
      group => {
        const ball = group.querySelector<SVGCircleElement>(".new-year-scene-bauble-hit")
        return ball ? [{ group, ball, centerX: 0, centerY: 0, radius: 0, isPointerInside: false }] : []
      },
    )
    if (baubles.length === 0) return

    /* Resolved through the root SVG's own screen matrix rather than the ball's bounding rect:
       the ball rides inside the group GSAP rotates, so a rect read mid-swing would return the
       displaced position and the hit region would chase the animation it just started. The root
       matrix ignores descendant transforms, so this always describes the bauble at rest. The
       viewBox is sliced with a preserved aspect ratio, so one axis scale covers the radius */
    const measureBaubles = () => {
      baubles.forEach(bauble => {
        const matrix = bauble.ball.ownerSVGElement?.getScreenCTM()
        if (!matrix) return

        const localX = bauble.ball.cx.baseVal.value
        const localY = bauble.ball.cy.baseVal.value
        bauble.centerX = matrix.a * localX + matrix.c * localY + matrix.e
        bauble.centerY = matrix.b * localX + matrix.d * localY + matrix.f
        bauble.radius = bauble.ball.r.baseVal.value * matrix.a
      })
    }

    const handlePointerMove = (event: PointerEvent) => {
      baubles.forEach(bauble => {
        const dx = event.clientX - bauble.centerX
        const dy = event.clientY - bauble.centerY
        const isPointerInside = dx * dx + dy * dy <= bauble.radius * bauble.radius

        /* Only the crossing into the ball starts a swing, so resting the pointer on one lets the
           tween finish instead of restarting it on every sub-pixel move the mouse reports */
        if (isPointerInside && !bauble.isPointerInside) {
          /* The side the pointer came in on decides which way it swings first. The ball hangs
             below the knot it turns around, so a positive angle sends it left — entering from
             the right therefore flips the whole set of angles to send it right instead */
          const swingDirection = dx > 0 ? -1 : 1

          gsap.to(bauble.group, {
            /* Every angle of the swing is stated, so the bauble travels out and back through
               each one. A fromTo starting at the far angle would place it there in a single
               frame and only ease the return, which reads as the bauble jumping rather than
               being knocked. Same damped set of angles as NewYearProjectOrnament */
            keyframes: {
              rotation: SWING_KEYFRAMES.map(angle => angle * swingDirection),
              easeEach: "sine.inOut",
            },
            /* svgOrigin is the one origin mechanism that ignores the element's own bounding
               box, so the bauble swings from the knot its cord is tied to (data-pivot)
               instead of orbiting its bbox corner */
            svgOrigin: bauble.group.dataset.pivot ?? "0 0",
            duration: 2.3,
            /* A quick re-entry restarts the swing cleanly instead of stacking tweens */
            overwrite: true,
          })
        }

        bauble.isPointerInside = isPointerInside
      })
    }

    measureBaubles()
    /* The backdrop is fixed, so only a relayout moves these — scrolling leaves them in place */
    const resizeObserver = new ResizeObserver(measureBaubles)
    resizeObserver.observe(sceneElement)
    window.addEventListener("pointermove", handlePointerMove, { passive: true })

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener("pointermove", handlePointerMove)
    }
  }, [reducedMotion, theme])

  if (theme !== "new-year") return null

  return (
    <motion.div
      className="new-year-scene absolute inset-[0]"
      ref={sceneRef}
      initial={false}
      animate={{ opacity: 1 }}
      transition={reducedMotion ? { duration: 0 } : { duration: 0.5 }}>
      <svg
        className="new-year-interior-svg absolute inset-[0] h-full w-full"
        aria-hidden="true"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMax slice"
        fill="none">
        <defs>
          <linearGradient id="new-year-room" x1="720" y1="0" x2="720" y2="900" gradientUnits="userSpaceOnUse">
            <stop stopColor="#213b4e" />
            <stop offset="0.54" stopColor="#1a2e41" />
            <stop offset="1" stopColor="#0f1e30" />
          </linearGradient>
          {/* The drifts are the white mass of the whole system, so they are near-opaque snow
              rather than a wash. Back to front, each one a little brighter */}
          <linearGradient id="new-year-drift-back" x1="720" y1="600" x2="720" y2="900" gradientUnits="userSpaceOnUse">
            <stop stopColor="#eee9dc" />
            <stop offset="1" stopColor="#dcd6c7" />
          </linearGradient>
          <linearGradient id="new-year-drift-mid" x1="720" y1="660" x2="720" y2="900" gradientUnits="userSpaceOnUse">
            <stop stopColor="#f8f5ec" />
            <stop offset="1" stopColor="#e9e4d7" />
          </linearGradient>
          <linearGradient id="new-year-drift-front" x1="720" y1="720" x2="720" y2="900" gradientUnits="userSpaceOnUse">
            <stop stopColor="#fffefa" />
            <stop offset="1" stopColor="#f3eee2" />
          </linearGradient>
          <radialGradient id="new-year-bauble-red" cx="0" cy="0" r="1" gradientTransform="translate(-8 -9) scale(34)">
            <stop stopColor="#f4566a" />
            <stop offset="0.42" stopColor="#c81a30" />
            <stop offset="1" stopColor="#79101d" />
          </radialGradient>
          <radialGradient id="new-year-pool" cx="0" cy="0" r="1" gradientTransform="translate(720 470) scale(520 380)">
            <stop stopColor="#f7b23b" stopOpacity="0.3" />
            <stop offset="0.5" stopColor="#f7b23b" stopOpacity="0.1" />
            <stop offset="1" stopColor="#f7b23b" stopOpacity="0" />
          </radialGradient>
          <radialGradient
            id="new-year-vignette"
            cx="0"
            cy="0"
            r="1"
            gradientTransform="translate(720 400) scale(980 720)">
            <stop stopColor="#081522" stopOpacity="0" />
            <stop offset="0.78" stopColor="#081522" stopOpacity="0" />
            <stop offset="1" stopColor="#081522" stopOpacity="0.34" />
          </radialGradient>
          <filter id="new-year-bokeh-blur" x="-160%" y="-160%" width="420%" height="420%">
            <feGaussianBlur stdDeviation="17" />
          </filter>
          <filter id="new-year-bulb-blur" x="-160%" y="-160%" width="420%" height="420%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>

        <rect width="1440" height="900" fill="url(#new-year-room)" />

        {/* A low warm glow across the snow, so the amber still reads as the third light source */}
        <ellipse
          data-new-year-window-pool
          cx="640"
          cy="640"
          rx="620"
          ry="240"
          fill="url(#new-year-pool)"
          opacity="0.5"
        />

        {/* Fairy-light string sagging across the window head. Run to the viewBox edges (not a
            few px short of them) so both ends read as continuing past the frame rather than
            dangling in open sky with nothing there to hang from */}
        <path d="M0 440Q720 600 1440 440" stroke="#d9c397" strokeOpacity="0.55" strokeWidth="3" />
        {BULBS.map(bulb => (
          <g key={bulb.x}>
            <circle
              data-new-year-bokeh
              cx={bulb.x}
              cy={bulb.y + 12}
              r="19"
              fill="#f7b23b"
              opacity="0.3"
              filter="url(#new-year-bokeh-blur)"
            />
            <circle
              data-new-year-bulb
              cx={bulb.x}
              cy={bulb.y + 12}
              r="7"
              fill="#ffd489"
              opacity="0.9"
              filter="url(#new-year-bulb-blur)"
            />
          </g>
        ))}

        {/* Three baubles hung off the same string. The old set hung from the top corners, where the
            navbar plate covered them at every width. data-pivot is the knot, in user-space units.
            The swing is driven by the pointer-crossing effect above rather than by handlers here;
            .new-year-scene-bauble-hit marks the ball whose geometry that effect measures. */}
        <g data-new-year-bauble data-pivot="443 506">
          <path d="M443 506V544" stroke="#d9c397" strokeOpacity="0.72" strokeWidth="2.5" />
          <rect x="437" y="542" width="12" height="9" rx="2" fill="#d9c397" />
          <circle
            className="new-year-scene-bauble-hit"
            cx="443"
            cy="572"
            r="22"
            fill="url(#new-year-bauble-red)"
          />
          <circle cx="435" cy="563" r="6" fill="#ffe3e6" fillOpacity="0.5" />
        </g>
        <g data-new-year-bauble data-pivot="720 520">
          <path d="M720 520V554" stroke="#d9c397" strokeOpacity="0.72" strokeWidth="2.2" />
          <circle className="new-year-scene-bauble-hit" cx="720" cy="570" r="15" fill="url(#new-year-bauble-red)" />
          <circle cx="715" cy="565" r="4.2" fill="#ffe3e6" fillOpacity="0.5" />
        </g>
        <g data-new-year-bauble data-pivot="997 506">
          <path d="M997 506V540" stroke="#d9c397" strokeOpacity="0.72" strokeWidth="2.5" />
          <rect x="992" y="538" width="10" height="8" rx="2" fill="#d9c397" />
          <circle
            className="new-year-scene-bauble-hit"
            cx="997"
            cy="564"
            r="18"
            fill="url(#new-year-bauble-red)"
          />
          <circle cx="991" cy="558" r="4.7" fill="#ffe3e6" fillOpacity="0.5" />
        </g>

        {/* The snow itself: three banked drifts, back to front. This is where the white lives */}
        <path
          d="M0 632C150 596 300 638 470 620C650 602 820 642 1000 616C1180 590 1320 628 1440 604V900H0V632Z"
          fill="url(#new-year-drift-back)"
        />
        <path
          d="M0 694C180 658 340 696 520 680C700 664 880 700 1060 678C1240 656 1350 690 1440 672V900H0V694Z"
          fill="url(#new-year-drift-mid)"
        />

        {/* The cottage sits back on the middle drift, its lights above the door line */}
        <SnowHouse x={1306} y={674} scale={0.6} />

        {/* Firs and snowmen stand on the middle drift, before the front drift buries their feet */}
        <SnowFir x={120} y={676} scale={1} />
        <SnowFir x={1418} y={660} scale={0.66} />
        <SnowFir x={806} y={690} scale={0.62} />
        <Snowman x={566} y={648} scale={0.92} />
        <Snowman x={244} y={672} scale={0.58} />

        <path
          d="M0 762C200 732 380 770 580 756C780 742 980 776 1180 754C1320 738 1390 760 1440 750V900H0V762Z"
          fill="url(#new-year-drift-front)"
        />

        <rect width="1440" height="900" fill="url(#new-year-vignette)" />
      </svg>
      <canvas className="new-year-snow-canvas absolute inset-[0] h-full w-full" ref={canvasRef} aria-hidden="true" />
    </motion.div>
  )
}
