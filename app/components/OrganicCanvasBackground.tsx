import React, { useRef, useEffect } from "react"
import { twMerge } from "tailwind-merge"

interface ParticleCanvas {
  width: number
  height: number
}

// 1. particle system for organic movement
class Particle {
  x: number = 0
  y: number = 0
  vx: number = 0
  vy: number = 0
  radius: number = 0
  opacity: number = 0
  pulse: number = 0
  angle: number = 0
  life: number = 0
  currentRadius: number = 0
  canvas: ParticleCanvas
  // organic movement variables
  noiseX: number = 0
  noiseY: number = 0
  noiseSpeed: number = 0
  wanderAngle: number = 0
  wanderRadius: number = 0
  wanderDistance: number = 0
  // visibility and scaling mechanics
  isVisible: number = 1
  hideTimer: number = 0
  hideDelay: number = 0
  maxHideTime: number = 0
  scale: number = 0
  targetScale: number = 1
  scaleSpeed: number = 0

  constructor(canvas: ParticleCanvas) {
    this.canvas = canvas
    this.reset()
    this.life = Math.random() * 100
    this.setupOrganicMovement()
    this.setupVisibilityMechanics()
  }

  setupOrganicMovement() {
    this.noiseX = Math.random() * 1000
    this.noiseY = Math.random() * 1000
    this.noiseSpeed = (Math.random() * 0.002 + 0.0006) * (Math.random() * 0.4 + 0.2) // 3-5x slower
    this.wanderAngle = Math.random() * Math.PI * 2
    this.wanderRadius = Math.random() * 60 + 20
    this.wanderDistance = Math.random() * 80 + 40
  }

  setupVisibilityMechanics() {
    // Ensure we always have 2-3 bubbles visible
    const visibilityChance = 0.7 // 70% chance to be initially visible
    this.isVisible = Math.random() < visibilityChance ? 1 : 0
    this.hideDelay = Math.random() * 1800 + 1200 // 20-50 seconds at 60fps
    this.maxHideTime = Math.random() * 900 + 600 // 10-25 seconds hidden

    // Scaling animation setup
    this.scale = this.isVisible ? 1 : 0
    this.targetScale = this.isVisible ? 1 : 0
    this.scaleSpeed = 0.02 + Math.random() * 0.03 // Random speed between 0.02-0.05
  }

  reset() {
    this.x = Math.random() * this.canvas.width
    this.y = Math.random() * this.canvas.height
    const speedMultiplier = Math.random() * 0.4 + 0.2 // 3-5x slower: 0.2-0.6 range
    this.vx = (Math.random() - 0.5) * 0.4 * speedMultiplier
    this.vy = (Math.random() - 0.5) * 0.4 * speedMultiplier
    this.radius = Math.random() * 120 + 50 // Adjusted size for better visibility
    this.opacity = Math.random() * 0.4 + 0.1
    this.pulse = Math.random() * 0.0075 + 0.0025
    this.angle = 0
  }

  // organic noise function for smooth random movement
  noise(x: number): number {
    const intX = Math.floor(x)
    const fracX = x - intX
    const a = this.hash(intX)
    const b = this.hash(intX + 1)
    return this.lerp(a, b, this.smoothstep(fracX))
  }

  hash(x: number): number {
    x = ((x >> 16) ^ x) * 0x45d9f3b
    x = ((x >> 16) ^ x) * 0x45d9f3b
    x = (x >> 16) ^ x
    return (x / 0x100000000 + 0.5) * 2 - 1
  }

  lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t
  }

  smoothstep(t: number): number {
    return t * t * (3 - 2 * t)
  }

  // Ease-in-out function for smooth scaling
  easeInOut(t: number): number {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
  }

  update() {
    // 2. handle visibility mechanics with better timing
    this.hideTimer++

    if (this.isVisible && this.hideTimer > this.hideDelay) {
      // Start disappearing
      this.targetScale = 0
      if (this.scale <= 0.05) {
        this.isVisible = 0
        this.hideTimer = 0
        this.hideDelay = Math.random() * 1800 + 1200 // 20-50 seconds
      }
    } else if (!this.isVisible && this.hideTimer > this.maxHideTime) {
      // Start appearing
      this.isVisible = 1
      this.targetScale = 1
      this.hideTimer = 0
      this.hideDelay = Math.random() * 2400 + 1800 // 30-70 seconds
      this.maxHideTime = Math.random() * 900 + 600 // 10-25 seconds hidden
    }

    // 3. smooth scaling animation with ease-in-out
    const scaleDiff = this.targetScale - this.scale
    const scalingFactor = this.easeInOut(Math.abs(scaleDiff))
    this.scale += scaleDiff * this.scaleSpeed * (1 + scalingFactor)
    this.scale = Math.max(0, Math.min(1, this.scale))

    // Skip movement updates if not visible
    if (this.scale <= 0) return

    // 4. organic wandering behavior (3-5x slower)
    this.wanderAngle += (Math.random() - 0.5) * 0.08 // reduced from 0.3
    const wanderX = Math.cos(this.wanderAngle) * this.wanderRadius
    const wanderY = Math.sin(this.wanderAngle) * this.wanderRadius

    // 5. perlin-like noise for smooth organic movement
    this.noiseX += this.noiseSpeed
    this.noiseY += this.noiseSpeed * 0.7
    const noiseForceX = this.noise(this.noiseX) * 0.15 // reduced from 0.6
    const noiseForceY = this.noise(this.noiseY) * 0.15 // reduced from 0.6

    // 6. combine forces for complex organic movement
    this.vx += wanderX * 0.001 + noiseForceX * 0.08 + (Math.random() - 0.5) * 0.02 // all reduced
    this.vy += wanderY * 0.001 + noiseForceY * 0.08 + (Math.random() - 0.5) * 0.02 // all reduced

    // 7. apply damping to prevent infinite acceleration
    this.vx *= 0.99 // increased damping
    this.vy *= 0.99 // increased damping

    // 8. limit maximum speed (reduced)
    const maxSpeed = 0.4 // reduced from 1.5
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy)
    if (speed > maxSpeed) {
      this.vx = (this.vx / speed) * maxSpeed
      this.vy = (this.vy / speed) * maxSpeed
    }

    // 9. apply movement with subtle sine wave overlay
    this.x += this.vx + Math.sin(this.angle * 0.4) * 0.05 // reduced from 0.2
    this.y += this.vy + Math.cos(this.angle * 0.6) * 0.05 // reduced from 0.2
    this.angle += 0.004 + Math.sin(this.life * 0.1) * 0.002 // reduced from 0.015 and 0.01

    // 10. pulsing effect
    this.life += this.pulse
    const pulseScale = 1 + Math.sin(this.life) * 0.3 + Math.sin(this.life * 1.7) * 0.1
    this.currentRadius = this.radius * pulseScale * this.scale

    // 11. boundary wrapping with smooth transition - keep particles within bounds
    const margin = this.currentRadius
    if (this.x < -margin) this.x = this.canvas.width + margin
    if (this.x > this.canvas.width + margin) this.x = -margin
    if (this.y < -margin) this.y = this.canvas.height + margin
    if (this.y > this.canvas.height + margin) this.y = -margin
  }

  draw(ctx: CanvasRenderingContext2D, brandColor: string) {
    if (this.scale <= 0) return

    const fadeOpacity = this.scale * this.opacity
    const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.currentRadius)
    gradient.addColorStop(0, `hsla(${brandColor}, ${fadeOpacity})`)
    gradient.addColorStop(0.4, `hsla(${brandColor}, ${fadeOpacity * 0.5})`)
    gradient.addColorStop(1, "hsla(0, 0%, 0%, 0)")

    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.currentRadius, 0, Math.PI * 2)
    ctx.fill()
  }
}

interface OrganicCanvasBackgroundProps {
  children: React.ReactNode
  className?: string
  parentClassName?: string
  particleCount?: number
  brandHsl?: string
}

export function OrganicCanvasBackground({
  children,
  className = "",
  parentClassName = "",
  particleCount = 8,
  brandHsl = "210, 100%, 50%",
}: OrganicCanvasBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number | null>(null)
  const particlesRef = useRef<Particle[]>([])
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const observerRef = useRef<ResizeObserver | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // 5. setup canvas size with proper scaling and overflow prevention
    const updateCanvasSize = () => {
      const containerRect = container.getBoundingClientRect()
      const width = Math.floor(containerRect.width)
      const height = Math.floor(containerRect.height)
      if (width <= 0 || height <= 0) return // Early return on invalid size
      const dpr = window.devicePixelRatio || 1

      // Set canvas internal dimensions
      canvas.width = width * dpr
      canvas.height = height * dpr

      // Scale context for high DPI
      ctx.scale(dpr, dpr)

      // Set CSS dimensions to match container exactly
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`

      // 6. reinitialize particles with new dimensions
      particlesRef.current = Array.from(
        { length: particleCount },
        () =>
          new Particle({
            width: width,
            height: height,
          }),
      )
    }

    // 7. animation loop
    const animate = () => {
      const containerRect = container.getBoundingClientRect()
      const width = Math.floor(containerRect.width)
      const height = Math.floor(containerRect.height)

      ctx.clearRect(0, 0, width, height)

      // Ensure we always have at least 2-3 visible particles
      let visibleCount = 0
      particlesRef.current.forEach(particle => {
        if (particle.scale > 0.1) visibleCount++
      })

      // If too few visible, force some to appear
      if (visibleCount < 2) {
        particlesRef.current.forEach((particle, index) => {
          if (particle.scale <= 0.1 && index < 3) {
            particle.targetScale = 1
            particle.isVisible = 1
          }
        })
      }

      particlesRef.current.forEach(particle => {
        particle.update()
        particle.draw(ctx, brandHsl)
      })

      animationRef.current = requestAnimationFrame(animate)
    }

    // 8. throttled resize handler
    const handleResize = () => {
      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current)
      resizeTimeoutRef.current = setTimeout(updateCanvasSize, 100)
    }

    observerRef.current = new ResizeObserver(handleResize)
    observerRef.current.observe(container)

    updateCanvasSize()
    animate()

    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current)
      if (observerRef.current) observerRef.current.disconnect()
    }
  }, [particleCount, brandHsl])

  return (
    <div
      ref={containerRef}
      className={twMerge("relative w-full h-full overflow-hidden", className)}
      style={{ position: "relative" }}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none opacity-80"
        style={{
          mixBlendMode: "screen",
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
        }}
      />
      <div className={twMerge("relative z-10 w-full h-full", parentClassName)}>{children}</div>
    </div>
  )
}
