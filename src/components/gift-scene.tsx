import { ContactShadows, Environment, Float, Html, Lightformer, RoundedBox, useTexture } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Suspense, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { clamp, easeInOut, prog, spring } from '@/lib/motion'

/**
 * The landing page's 3D gift. It drops in and settles, leans toward the mouse, and as the
 * hero scrolls by (progress 0 → 1) the lid lifts and gifts from a real wishlist rise out
 * and circle it. Loaded only in the browser; see Hero in routes/index.tsx.
 */
export type SceneProps = {
  /** Scroll progress through the hero, 0 to 1, written by the page without re-rendering. */
  progress: React.RefObject<number>
  still: boolean
  active: boolean
  compact: boolean
}

const PURPLE = '#a855f7'
const RIBBON = '#f9cfe3'

const ITEMS = [
  { img: '/images/demo/camera.jpg', price: '₦96,000', angle: 0.2, height: 1.7, radius: 2.5 },
  { img: '/images/demo/mixer.jpg', price: '₦180,000', angle: 1.25, height: 1.15, radius: 2.75 },
  { img: '/images/demo/headphones.jpg', price: '₦45,500', angle: 2.3, height: 1.95, radius: 2.45 },
  { img: '/images/demo/sneakers.jpg', price: '₦52,500', angle: 3.35, height: 1.3, radius: 2.7 },
  { img: '/images/demo/pour-over.jpg', price: '₦45,000', angle: 4.4, height: 1.85, radius: 2.5 },
  { img: '/images/demo/beach.jpg', price: 'Honeymoon fund', angle: 5.4, height: 1.05, radius: 2.75 },
]

export default function GiftScene(props: SceneProps) {
  return (
    <Canvas
      dpr={[1, props.compact ? 1.5 : 2]}
      frameloop={props.active && !props.still ? 'always' : 'demand'}
      camera={{ position: [0, 0.9, props.compact ? 9.6 : 8.2], fov: 34 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      style={{ pointerEvents: 'none' }}
    >
      <ambientLight intensity={0.55} />
      <directionalLight position={[4, 6, 5]} intensity={1.6} color="#fff6f0" />
      <directionalLight position={[-5, 2, -3]} intensity={0.6} color="#c4b5fd" />
      <Environment resolution={256} frames={1}>
        {/* A soft studio made of light panels, so nothing has to be downloaded. */}
        <Lightformer form="rect" intensity={2.2} position={[0, 4, 3]} scale={[8, 3, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#f9a8d4" position={[-5, 1, 1]} rotation-y={Math.PI / 2} scale={[6, 2, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#93c5fd" position={[5, 0, 0]} rotation-y={-Math.PI / 2} scale={[6, 2, 1]} />
        <Lightformer form="ring" intensity={1.5} position={[0, -3, 4]} scale={3} />
      </Environment>
      <Suspense fallback={null}>
        <Gift {...props} />
      </Suspense>
      {!props.compact && <Confetti still={props.still} />}
      <ContactShadows position={[0, -1.25, 0]} opacity={0.32} blur={2.6} far={4} scale={9} color="#581c87" />
    </Canvas>
  )
}

function Gift({ progress, still }: SceneProps) {
  const { viewport } = useThree()
  // Wide screens put the gift to the right of the headline; tall ones below it.
  const wide = viewport.aspect > 1.15
  const baseX = wide ? viewport.width * 0.2 : 0
  const baseY = wide ? -0.45 : -viewport.height * 0.03
  const size = wide ? 0.8 : Math.min(0.8, viewport.width / 7.2)
  const root = useRef<THREE.Group>(null)
  const body = useRef<THREE.Group>(null)
  const lid = useRef<THREE.Group>(null)
  const items = useRef<(THREE.Group | null)[]>([])
  const start = useRef<number | null>(null)
  const lean = useRef({ x: 0, y: 0 })

  useFrame((state, delta) => {
    if (start.current === null) start.current = state.clock.elapsedTime
    const t = still ? 10 : state.clock.elapsedTime - start.current
    const p = clamp(progress.current ?? 0)

    // Drop in, land with a little squash, settle.
    const fall = spring(t, 90, 11)
    const land = t > 0.42 ? Math.exp(-(t - 0.42) * 7) * Math.sin((t - 0.42) * 18) : 0
    if (root.current) {
      // Open, it drifts toward the middle so the gifts have room to circle.
      root.current.position.x = baseX * (1 - easeInOut(prog(p, 0.1, 0.6)) * 0.35)
      root.current.position.y = baseY + 4.5 * (1 - fall) + (still ? 0 : Math.sin(t * 1.1) * 0.05) - p * 0.35
      root.current.scale.set(size * (1 + land * 0.08), size * (1 - land * 0.1), size * (1 + land * 0.08))
      // Lean toward the pointer, smoothed.
      lean.current.x += (state.pointer.y * -0.18 - lean.current.x) * Math.min(1, delta * 3)
      lean.current.y += (state.pointer.x * 0.35 - lean.current.y) * Math.min(1, delta * 3)
      root.current.rotation.x = 0.12 + (still ? 0 : lean.current.x)
      root.current.rotation.y = -0.55 + (still ? 0 : lean.current.y + t * 0.06) + p * 0.9
    }
    if (body.current) body.current.position.y = 0

    // The lid lifts and tips back as you scroll.
    const open = easeInOut(prog(p, 0.05, 0.45))
    if (lid.current) {
      lid.current.position.set(0, 0.86 + open * 1.35, -open * 0.45)
      lid.current.rotation.set(-open * 0.6, 0, open * 0.18)
    }

    // Gifts rise out of the box one after another and circle it.
    items.current.forEach((g, i) => {
      if (!g) return
      const it = ITEMS[i]
      const rise = easeInOut(prog(p, 0.12 + i * 0.05, 0.5 + i * 0.05))
      const spin = it.angle + p * 1.4 + (still ? 0 : t * 0.12)
      g.position.set(Math.cos(spin) * it.radius * rise, 0.2 + (it.height - 0.2) * rise + (still ? 0 : Math.sin(t * 1.3 + i) * 0.06), Math.sin(spin) * it.radius * rise)
      g.scale.setScalar(0.05 + 0.95 * rise)
      // Cards turn to face the camera as they come out.
      g.rotation.set(0, -(root.current?.rotation.y ?? 0) + Math.sin(t * 0.8 + i) * 0.08, Math.sin(i * 1.7) * 0.08 * rise)
      g.visible = rise > 0.01
    })
  })

  return (
    <group ref={root}>
      <group ref={body}>
        <RoundedBox args={[2, 1.6, 2]} radius={0.06} smoothness={4}>
          <meshPhysicalMaterial color={PURPLE} roughness={0.32} metalness={0.05} clearcoat={1} clearcoatRoughness={0.18} sheen={0.4} sheenColor="#f0abfc" />
        </RoundedBox>
        <Ribbon size={[0.34, 1.62, 2.02]} />
        <Ribbon size={[2.02, 1.62, 0.34]} />
      </group>
      <group ref={lid} position={[0, 0.86, 0]}>
        <RoundedBox args={[2.16, 0.38, 2.16]} radius={0.06} smoothness={4}>
          <meshPhysicalMaterial color="#b46cf8" roughness={0.3} clearcoat={1} clearcoatRoughness={0.15} sheen={0.4} sheenColor="#f0abfc" />
        </RoundedBox>
        <Ribbon size={[0.36, 0.4, 2.18]} />
        <Ribbon size={[2.18, 0.4, 0.36]} />
        <Bow />
      </group>
      {ITEMS.map((it, i) => (
        <group
          key={it.img}
          ref={(el) => {
            items.current[i] = el
          }}
          visible={false}
        >
          <ItemCard img={it.img} price={it.price} />
        </group>
      ))}
    </group>
  )
}

function Ribbon({ size }: { size: [number, number, number] }) {
  return (
    <mesh>
      <boxGeometry args={size} />
      <meshPhysicalMaterial color={RIBBON} roughness={0.28} metalness={0} clearcoat={0.5} clearcoatRoughness={0.2} sheen={1} sheenColor="#ffffff" />
    </mesh>
  )
}

function Bow() {
  return (
    <group position={[0, 0.3, 0]}>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.3, 0.12, 0]} rotation={[Math.PI / 2, side * 0.5, side * 0.5]} scale={[1, 0.7, 1]}>
          <torusGeometry args={[0.3, 0.085, 20, 48]} />
          <meshPhysicalMaterial color={RIBBON} roughness={0.28} metalness={0} clearcoat={0.5} clearcoatRoughness={0.2} sheen={1} sheenColor="#ffffff" />
        </mesh>
      ))}
      <mesh position={[0, 0.06, 0]}>
        <sphereGeometry args={[0.13, 24, 24]} />
        <meshPhysicalMaterial color={RIBBON} roughness={0.28} metalness={0} clearcoat={0.5} />
      </mesh>
    </group>
  )
}

function ItemCard({ img, price }: { img: string; price: string }) {
  const texture = useTexture(img)
  useMemo(() => {
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = 4
  }, [texture])
  return (
    <group>
      <RoundedBox args={[1.02, 1.22, 0.05]} radius={0.06} smoothness={3}>
        <meshStandardMaterial color="#ffffff" roughness={0.5} />
      </RoundedBox>
      <mesh position={[0, 0.08, 0.03]}>
        <planeGeometry args={[0.88, 0.88]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      <Html position={[0, -0.47, 0.04]} center transform distanceFactor={4} zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
        <span className="font-body block rounded-full px-2 text-[13px] whitespace-nowrap text-neutral-700">{price}</span>
      </Html>
    </group>
  )
}

/** A few small gifts drifting in the background for depth. */
function Confetti({ still }: { still: boolean }) {
  const gifts = [
    { pos: [-4.2, 1.8, -3] as const, color: '#f472b6', s: 0.42 },
    { pos: [4.4, 2.3, -4] as const, color: '#fbbf24', s: 0.36 },
    { pos: [-3.4, -0.6, -2] as const, color: '#60a5fa', s: 0.3 },
    { pos: [3.6, -0.2, -1.5] as const, color: '#34d399', s: 0.28 },
    { pos: [0.8, 3.1, -5] as const, color: '#c084fc', s: 0.4 },
  ]
  return (
    <>
      {gifts.map((g, i) => (
        <Float key={i} speed={still ? 0 : 1.2 + i * 0.2} rotationIntensity={still ? 0 : 1.2} floatIntensity={still ? 0 : 1}>
          <group position={g.pos as unknown as [number, number, number]} scale={g.s} rotation={[0.4 * i, 0.7 * i, 0.2]}>
            <RoundedBox args={[1, 1, 1]} radius={0.06} smoothness={3}>
              <meshPhysicalMaterial color={g.color} roughness={0.35} clearcoat={1} clearcoatRoughness={0.2} />
            </RoundedBox>
            <mesh>
              <boxGeometry args={[0.2, 1.02, 1.02]} />
              <meshStandardMaterial color="#ffffff" roughness={0.3} />
            </mesh>
            <mesh>
              <boxGeometry args={[1.02, 1.02, 0.2]} />
              <meshStandardMaterial color="#ffffff" roughness={0.3} />
            </mesh>
          </group>
        </Float>
      ))}
    </>
  )
}
