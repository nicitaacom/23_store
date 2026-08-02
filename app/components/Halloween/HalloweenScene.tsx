"use client"

import { useEffect, useRef } from "react"

import { motion, useReducedMotion } from "framer-motion"
import gsap from "gsap"

import { useSiteTheme } from "@/hooks/ui/useSiteTheme"

interface FogWisp {
  x: number
  y: number
  radiusX: number
  radiusY: number
  speed: number
  phase: number
  tone: "green" | "violet"
}

interface SpectralMote {
  x: number
  y: number
  radius: number
  speed: number
  phase: number
}

function isAmbientMotionPaused(reducedMotion: boolean | null) {
  return Boolean(reducedMotion) || document.hidden || document.body.classList.contains("modal-open")
}

export function HalloweenScene() {
  const theme = useSiteTheme()
  const reducedMotion = useReducedMotion()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (theme !== "halloween") return

    const canvas = canvasRef.current
    if (!canvas) return

    const context = canvas.getContext("2d")
    if (!context) return

    let width = 0
    let height = 0
    let animationFrame = 0
    let lastFrameTime = performance.now()
    let isRunning = false

    const fogWisps: FogWisp[] = Array.from({ length: 7 }, (_, index) => ({
      x: (index * 0.19 + 0.04) % 1,
      y: 0.25 + ((index * 0.17) % 0.62),
      radiusX: 0.13 + (index % 3) * 0.035,
      radiusY: 0.035 + (index % 2) * 0.018,
      speed: 0.0007 + (index % 4) * 0.00016,
      phase: index * 1.73,
      tone: index % 3 === 0 ? "green" : "violet",
    }))
    const motes: SpectralMote[] = Array.from({ length: 38 }, (_, index) => ({
      x: (index * 0.317 + 0.08) % 1,
      y: (index * 0.173 + 0.12) % 0.82,
      radius: 0.7 + (index % 4) * 0.35,
      speed: 0.0009 + (index % 5) * 0.00017,
      phase: index * 0.91,
    }))

    const resizeCanvas = () => {
      const bounds = canvas.getBoundingClientRect()
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5)
      width = Math.max(1, bounds.width)
      height = Math.max(1, bounds.height)
      canvas.width = Math.round(width * pixelRatio)
      canvas.height = Math.round(height * pixelRatio)
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
    }

    const drawFrame = (time: number) => {
      if (!isRunning) return

      const elapsed = Math.min(time - lastFrameTime, 40)
      lastFrameTime = time
      context.clearRect(0, 0, width, height)

      fogWisps.forEach(wisp => {
        wisp.x += wisp.speed * elapsed
        if (wisp.x - wisp.radiusX > 1.12) wisp.x = -wisp.radiusX

        const centerX = wisp.x * width
        const centerY = (wisp.y + Math.sin(time * 0.00022 + wisp.phase) * 0.025) * height
        const gradient = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, wisp.radiusX * width)
        const color = wisp.tone === "green" ? "128, 190, 126" : "154, 117, 190"
        gradient.addColorStop(0, `rgba(${color}, 0.08)`)
        gradient.addColorStop(0.5, `rgba(${color}, 0.035)`)
        gradient.addColorStop(1, `rgba(${color}, 0)`)
        context.save()
        context.scale(1, wisp.radiusY / wisp.radiusX)
        context.fillStyle = gradient
        context.fillRect(0, 0, width, height * (wisp.radiusX / wisp.radiusY))
        context.restore()
      })

      motes.forEach(mote => {
        mote.y -= mote.speed * elapsed
        if (mote.y < -0.04) mote.y = 0.88
        const pulse = 0.22 + Math.sin(time * 0.0014 + mote.phase) * 0.14
        context.beginPath()
        context.arc(
          (mote.x + Math.sin(time * 0.00018 + mote.phase) * 0.018) * width,
          mote.y * height,
          mote.radius,
          0,
          Math.PI * 2,
        )
        context.fillStyle = `rgba(180, 255, 175, ${Math.max(0.05, pulse)})`
        context.fill()
      })

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
      if (isAmbientMotionPaused(reducedMotion)) stopCanvas()
      else startCanvas()
    }

    resizeCanvas()
    syncCanvasState()

    const resizeObserver = new ResizeObserver(resizeCanvas)
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
    if (theme !== "halloween" || !sceneRef.current) return

    const animationContext = gsap.context(() => {
      if (reducedMotion) {
        gsap.set("[data-halloween-flame]", { opacity: 0.9, scaleY: 1 })
        gsap.set("[data-halloween-bat]", { x: 0, y: 0 })
        return
      }

      gsap.to('[data-halloween-bat="near"]', {
        x: "72vw",
        y: -42,
        duration: 18.5,
        ease: "none",
        repeat: -1,
        repeatDelay: 5.2,
      })
      gsap.to('[data-halloween-bat="far"]', {
        x: "-64vw",
        y: 30,
        duration: 23,
        ease: "none",
        repeat: -1,
        repeatDelay: 8.3,
      })
      gsap.to("[data-halloween-flame]", {
        opacity: 0.58,
        scaleX: 0.82,
        scaleY: 1.16,
        transformOrigin: "50% 100%",
        duration: 0.17,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
        stagger: 0.08,
      })
      gsap.to("[data-halloween-pumpkin-glow]", {
        opacity: 0.48,
        duration: 2.7,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
        stagger: 0.7,
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

  if (theme !== "halloween") return null

  return (
    <motion.div
      ref={sceneRef}
      className="halloween-scene absolute inset-[0]"
      initial={false}
      animate={{ opacity: 1 }}
      transition={reducedMotion ? { duration: 0 } : { duration: 0.5 }}>
      <canvas
        ref={canvasRef}
        className="halloween-ambient-canvas absolute inset-[0] h-full w-full"
        aria-hidden="true"
      />
      <svg
        aria-hidden="true"
        className="halloween-graveyard-svg absolute inset-[0] h-full w-full"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMax slice"
        fill="none">
        <defs>
          <radialGradient
            id="halloween-moon-glow"
            cx="0"
            cy="0"
            r="1"
            gradientTransform="translate(1110 185) scale(225)">
            <stop stopColor="#F4EDC7" stopOpacity="0.95" />
            <stop offset="0.34" stopColor="#BDAAD0" stopOpacity="0.5" />
            <stop offset="1" stopColor="#7B6198" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="halloween-sky" x1="720" y1="0" x2="720" y2="900" gradientUnits="userSpaceOnUse">
            <stop stopColor="#17101F" />
            <stop offset="0.52" stopColor="#0D0A13" />
            <stop offset="1" stopColor="#050407" />
          </linearGradient>
          <linearGradient id="halloween-ground" x1="720" y1="595" x2="720" y2="900" gradientUnits="userSpaceOnUse">
            <stop stopColor="#131019" />
            <stop offset="1" stopColor="#040305" />
          </linearGradient>
          <filter id="halloween-soft-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="14" />
          </filter>
        </defs>

        <rect width="1440" height="900" fill="url(#halloween-sky)" />
        <circle cx="1110" cy="185" r="225" fill="url(#halloween-moon-glow)" />
        <circle cx="1110" cy="185" r="92" fill="#DED6C7" fillOpacity="0.78" />
        <path
          d="M1060 152C1092 134 1130 133 1160 149M1072 205C1105 223 1142 218 1166 194"
          stroke="#A799A6"
          strokeOpacity="0.2"
          strokeWidth="11"
          strokeLinecap="round"
        />

        <g data-halloween-bat="near" className="halloween-scene-bat" transform="translate(180 214)">
          <path d="M0 10C17-6 39-2 52 14C65-5 89-8 106 8C84 13 71 29 52 48C34 29 22 17 0 10Z" fill="#050407" />
        </g>
        <g data-halloween-bat="far" className="halloween-scene-bat" transform="translate(1210 308) scale(.65)">
          <path d="M0 10C17-6 39-2 52 14C65-5 89-8 106 8C84 13 71 29 52 48C34 29 22 17 0 10Z" fill="#07060A" />
        </g>

        <path
          className="halloween-tree halloween-tree-left"
          d="M0 690V205L58 283L98 198L120 318L203 247L157 371L258 354L173 425L266 476L151 469L177 610L108 501L75 687H0Z"
          fill="#050407"
        />
        <path
          className="halloween-tree halloween-tree-right"
          d="M1440 695V250L1385 323L1351 235L1328 353L1247 292L1290 398L1198 390L1278 446L1195 501L1301 490L1277 625L1341 522L1372 690H1440Z"
          fill="#050407"
        />

        <path
          d="M0 671C195 622 341 692 515 656C730 612 918 689 1112 646C1238 618 1344 641 1440 617V900H0V671Z"
          fill="url(#halloween-ground)"
        />

        <g className="halloween-graves" fill="#1B1722" stroke="#62566F" strokeOpacity="0.42">
          <path d="M115 735V640C115 597 184 597 184 640V735H115Z" />
          <path d="M250 749V655L284 618L318 655V749H250Z" />
          <path d="M385 722V624H407V584H430V624H453V722H385Z" />
          <path d="M930 744V640C930 595 1004 595 1004 640V744H930Z" />
          <path d="M1081 727V623H1104V579H1129V623H1152V727H1081Z" />
          <path d="M1230 760V662L1269 612L1308 662V760H1230Z" />
        </g>

        <g className="halloween-fence" stroke="#322A3A" strokeWidth="8">
          <path d="M0 754H1440M0 819H1440" />
          <path d="M55 720V858M142 707V849M229 724V861M316 708V851M1124 710V852M1211 724V862M1298 704V849M1385 719V858" />
        </g>

        <g className="halloween-candles">
          <g transform="translate(64 696)">
            <rect x="0" y="25" width="18" height="61" rx="5" fill="#D4C9A4" />
            <path data-halloween-flame d="M9 28C-3 17 6 6 12 0C14 12 23 17 9 28Z" fill="#FF9C32" />
          </g>
          <g transform="translate(1355 708)">
            <rect x="0" y="25" width="18" height="61" rx="5" fill="#D4C9A4" />
            <path data-halloween-flame d="M9 28C-3 17 6 6 12 0C14 12 23 17 9 28Z" fill="#FF9C32" />
          </g>
        </g>

        <g className="halloween-scene-pumpkin" transform="translate(505 756)">
          <ellipse cx="55" cy="48" rx="52" ry="43" fill="#B84A16" stroke="#EE8B2D" strokeWidth="3" />
          <path d="M55 7C49-5 55-14 68-20" stroke="#678443" strokeWidth="8" strokeLinecap="round" />
          <path
            d="M20 40L38 27L45 48M89 40L72 27L65 48M33 64C48 79 65 79 80 63"
            stroke="#1C0A05"
            strokeWidth="8"
            strokeLinejoin="round"
          />
          <ellipse
            data-halloween-pumpkin-glow
            cx="55"
            cy="49"
            rx="48"
            ry="39"
            fill="#FF9D32"
            fillOpacity="0.2"
            filter="url(#halloween-soft-glow)"
          />
        </g>
        <g className="halloween-scene-pumpkin" transform="translate(846 774) scale(.78)">
          <ellipse cx="55" cy="48" rx="52" ry="43" fill="#B84A16" stroke="#EE8B2D" strokeWidth="3" />
          <path d="M55 7C49-5 55-14 68-20" stroke="#678443" strokeWidth="8" strokeLinecap="round" />
          <path
            d="M20 40L38 27L45 48M89 40L72 27L65 48M33 64C48 79 65 79 80 63"
            stroke="#1C0A05"
            strokeWidth="8"
            strokeLinejoin="round"
          />
          <ellipse
            data-halloween-pumpkin-glow
            cx="55"
            cy="49"
            rx="48"
            ry="39"
            fill="#FF9D32"
            fillOpacity="0.2"
            filter="url(#halloween-soft-glow)"
          />
        </g>
      </svg>
      <div className="halloween-scene-vignette absolute inset-[0]" />
    </motion.div>
  )
}
