// Real 3D objects for the film, rendered with three.js into a layer the 2D film draws in place.
// The gift is the landing hero's box (src/components/gift-scene.tsx): glossy clearcoat walls,
// a dark hollow inside with tissue paper, satin ribbon and bow. The celebration items are built
// from primitives in the same studio light.
//
// Every object is placed in screen pixels: (sx, sy) is the point where its base sits, z is depth
// in pixels (negative = toward the camera), size is its width in pixels at z = 0.
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'

const FOV = 30

function phys(color, o = {}) {
  return new THREE.MeshPhysicalMaterial({ color, roughness: 0.32, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.18, ...o })
}
const satin = (color) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.28, metalness: 0, clearcoat: 0.5, clearcoatRoughness: 0.2, sheen: 1, sheenColor: new THREE.Color('#ffffff') })
function mesh(geo, mat, pos = [0, 0, 0], rot = [0, 0, 0], scale) {
  const m = new THREE.Mesh(geo, mat); m.position.set(...pos); m.rotation.set(...rot); if (scale) m.scale.set(...scale); return m
}
const rbox = (w, h, d, r = 0.06, seg = 4) => new RoundedBoxGeometry(w, h, d, seg, r)

// ---------------------------------------------------------------- the gift (hero box)

function buildGift(color, ribbon) {
  const root = new THREE.Group()
  const body = new THREE.Group()
  const WALL = 0.09, half = 1 - WALL / 2
  const shell = phys(color, { sheen: 0.4, sheenColor: new THREE.Color('#f0abfc') })
  for (const [pos, size] of [[[0, 0, half], [2, 1.6, WALL]], [[0, 0, -half], [2, 1.6, WALL]], [[half, 0, 0], [WALL, 1.6, 2 - WALL * 2]], [[-half, 0, 0], [WALL, 1.6, 2 - WALL * 2]]])
    body.add(mesh(rbox(...size, 0.03, 3), shell, pos))
  body.add(mesh(new THREE.BoxGeometry(2 - WALL, 0.08, 2 - WALL), shell, [0, -0.76, 0]))
  // the inside: darker and matte, so the opening reads as deep
  const inner = new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(0.28), roughness: 0.95 })
  for (const [pos, rot] of [[[0, 0.02, half - WALL / 2 - 0.001], [0, Math.PI, 0]], [[0, 0.02, -half + WALL / 2 + 0.001], [0, 0, 0]], [[half - WALL / 2 - 0.001, 0.02, 0], [0, -Math.PI / 2, 0]], [[-half + WALL / 2 + 0.001, 0.02, 0], [0, Math.PI / 2, 0]]])
    body.add(mesh(new THREE.PlaneGeometry(2 - WALL * 2, 1.52), inner, pos, rot))
  body.add(mesh(new THREE.PlaneGeometry(2 - WALL * 2, 2 - WALL * 2), new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(0.14), roughness: 1 }), [0, -0.715, 0], [-Math.PI / 2, 0, 0]))
  // tissue paper peeking over the rim
  const tissue = [[[-0.45, 0.62, 0.3], [0.5, 0.3, 0.35]], [[0.5, 0.58, -0.25], [-0.45, -0.6, -0.3]], [[0.1, 0.66, 0.5], [0.75, 0.1, -0.15]], [[-0.2, 0.55, -0.5], [-0.7, 0.4, 0.2]]]
  tissue.forEach(([pos, rot], i) => body.add(mesh(new THREE.PlaneGeometry(1, 0.7), new THREE.MeshPhysicalMaterial({ color: i % 2 ? '#fbcfe8' : '#fdf2f8', roughness: 0.85, side: THREE.DoubleSide }), pos, rot)))
  const rib = satin(ribbon)
  for (const [size, pos] of [[[0.34, 1.62, 0.02], [0, 0, 1.006]], [[0.34, 1.62, 0.02], [0, 0, -1.006]], [[0.02, 1.62, 0.34], [1.006, 0, 0]], [[0.02, 1.62, 0.34], [-1.006, 0, 0]]])
    body.add(mesh(new THREE.BoxGeometry(...size), rib, pos))
  root.add(body)

  const lid = new THREE.Group(); lid.position.y = 0.86
  lid.add(mesh(rbox(2.16, 0.38, 2.16, 0.06, 4), phys(new THREE.Color(color).lerp(new THREE.Color('#ffffff'), 0.08), { roughness: 0.3, sheen: 0.4, sheenColor: new THREE.Color('#f0abfc') })))
  lid.add(mesh(new THREE.BoxGeometry(0.36, 0.4, 2.18), rib)); lid.add(mesh(new THREE.BoxGeometry(2.18, 0.4, 0.36), rib))
  const bow = new THREE.Group(); bow.position.y = 0.3
  for (const side of [-1, 1]) bow.add(mesh(new THREE.TorusGeometry(0.3, 0.085, 20, 48), rib, [side * 0.3, 0.12, 0], [Math.PI / 2, side * 0.5, side * 0.5], [1, 0.7, 1]))
  bow.add(mesh(new THREE.SphereGeometry(0.13, 24, 24), rib, [0, 0.06, 0]))
  lid.add(bow)
  root.add(lid)
  root.userData = { lid, baseY: 0.8 } // model base sits 0.8 below its centre
  return root
}

// ---------------------------------------------------------------- celebration items (base at y = 0)

function flame(y) {
  const g = new THREE.Group(); g.position.y = y
  g.add(mesh(new THREE.SphereGeometry(0.07, 16, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd27a').multiplyScalar(2.2), toneMapped: false }), [0, 0.06, 0], [0, 0, 0], [1, 1.8, 1]))
  g.add(mesh(new THREE.SphereGeometry(0.035, 12, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff7d6').multiplyScalar(3), toneMapped: false }), [0, 0.045, 0.01], [0, 0, 0], [1, 1.6, 1]))
  g.userData.flame = true
  return g
}
function stripes(a, b) {
  const c = document.createElement('canvas'); c.width = 64; c.height = 256
  const x = c.getContext('2d'); x.fillStyle = a; x.fillRect(0, 0, 64, 256); x.fillStyle = b
  for (let i = -4; i < 12; i++) { x.beginPath(); x.moveTo(0, i * 32); x.lineTo(64, i * 32 + 40); x.lineTo(64, i * 32 + 54); x.lineTo(0, i * 32 + 14); x.fill() }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t
}

const BUILD = {
  cake() {
    const g = new THREE.Group()
    const sponge = new THREE.MeshPhysicalMaterial({ color: '#fff4e6', roughness: 0.6, sheen: 0.6, sheenColor: new THREE.Color('#ffffff') })
    const icing = phys('#f9a8d4', { roughness: 0.25, clearcoat: 0.8 })
    g.add(mesh(new THREE.CylinderGeometry(1.08, 1.08, 0.06, 64), phys('#ffffff', { roughness: 0.2 }), [0, 0.03, 0])) // plate
    g.add(mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.7, 64), sponge, [0, 0.41, 0]))
    g.add(mesh(new THREE.CylinderGeometry(0.92, 0.92, 0.12, 64), icing, [0, 0.8, 0]))
    for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; g.add(mesh(new THREE.SphereGeometry(0.09, 16, 12), icing, [Math.cos(a) * 0.9, 0.72, Math.sin(a) * 0.9], [0, 0, 0], [1, 1.6, 1])) }
    g.add(mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.5, 64), sponge, [0, 1.11, 0]))
    g.add(mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.1, 64), phys('#c084fc', { roughness: 0.25 }), [0, 1.39, 0]))
    const colors = ['#60a5fa', '#f472b6', '#facc15']
    colors.forEach((c, i) => {
      const a = (i / 3) * Math.PI * 2 + 0.4
      g.add(mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.42, 16), new THREE.MeshStandardMaterial({ map: stripes('#ffffff', c), roughness: 0.4 }), [Math.cos(a) * 0.3, 1.65, Math.sin(a) * 0.3]))
      const f = flame(1.86); f.position.x = Math.cos(a) * 0.3; f.position.z = Math.sin(a) * 0.3; g.add(f)
    })
    return g
  },
  balloon(color = '#ec4899') {
    const g = new THREE.Group()
    const skin = phys(color, { roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.05 })
    g.add(mesh(new THREE.SphereGeometry(0.75, 48, 48), skin, [0, 2.2, 0], [0, 0, 0], [1, 1.18, 1]))
    g.add(mesh(new THREE.ConeGeometry(0.12, 0.18, 24), skin, [0, 1.3, 0]))
    g.add(mesh(new THREE.CylinderGeometry(0.008, 0.008, 1.25, 6), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.5 }), [0, 0.62, 0], [0, 0, 0.06]))
    return g
  },
  candles() {
    const g = new THREE.Group()
    ;[['#f472b6', -0.32, 1.5], ['#60a5fa', 0.05, 1.8], ['#a855f7', 0.38, 1.35]].forEach(([c, x, h]) => {
      g.add(mesh(new THREE.CylinderGeometry(0.14, 0.14, h, 32), new THREE.MeshPhysicalMaterial({ map: stripes('#ffffff', c), roughness: 0.35, clearcoat: 0.6 }), [x, h / 2, 0]))
      g.add(mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.12, 6), new THREE.MeshStandardMaterial({ color: '#292524' }), [x, h + 0.05, 0]))
      const f = flame(h + 0.1); f.position.x = x; f.scale.setScalar(1.8); g.add(f)
    })
    return g
  },
  rings() {
    const g = new THREE.Group()
    const gold = new THREE.MeshPhysicalMaterial({ color: '#f5c451', metalness: 1, roughness: 0.18, clearcoat: 0.6 })
    g.add(mesh(new THREE.TorusGeometry(0.62, 0.11, 32, 96), gold, [-0.3, 0.75, 0], [0.3, 0.4, 0]))
    g.add(mesh(new THREE.TorusGeometry(0.55, 0.09, 32, 96), gold, [0.35, 0.72, 0.05], [-0.2, -0.6, 0.4]))
    g.add(mesh(new THREE.OctahedronGeometry(0.2, 0), new THREE.MeshPhysicalMaterial({ color: '#e0f2fe', metalness: 0.1, roughness: 0.02, clearcoat: 1, iridescence: 1, iridescenceIOR: 1.6 }), [-0.3, 1.42, 0.2], [0, 0.4, 0], [1, 1.25, 1]))
    return g
  },
  champagne() {
    const g = new THREE.Group()
    const pts = [[0, 0], [0.42, 0], [0.45, 0.06], [0.45, 1.5], [0.4, 1.75], [0.2, 2.1], [0.15, 2.45], [0.16, 2.75], [0, 2.78]].map(([x, y]) => new THREE.Vector2(x, y))
    g.add(mesh(new THREE.LatheGeometry(pts, 64), phys('#14532d', { roughness: 0.12, clearcoat: 1, metalness: 0.2 })))
    const foil = new THREE.MeshPhysicalMaterial({ color: '#e7c35a', metalness: 1, roughness: 0.3 })
    g.add(mesh(new THREE.CylinderGeometry(0.17, 0.21, 0.6, 48), foil, [0, 2.5, 0]))
    g.add(mesh(new THREE.CylinderGeometry(0.455, 0.455, 0.55, 64, 1, true), new THREE.MeshStandardMaterial({ color: '#fdf6e3', roughness: 0.6, side: THREE.DoubleSide }), [0, 0.85, 0]))
    g.add(mesh(new THREE.CylinderGeometry(0.457, 0.457, 0.06, 64, 1, true), foil, [0, 1.13, 0]))
    return g
  },
  flowers() {
    const g = new THREE.Group()
    const paper = new THREE.MeshStandardMaterial({ color: '#f5e6d3', roughness: 0.85, side: THREE.DoubleSide })
    g.add(mesh(new THREE.ConeGeometry(0.75, 1.6, 48, 1, true), paper, [0, 0.8, 0], [Math.PI, 0, 0]))
    const stem = new THREE.MeshStandardMaterial({ color: '#4d7c0f', roughness: 0.6 })
    const heads = [[0, 1.95, 0, '#f9a8d4'], [-0.42, 1.75, 0.15, '#ffffff'], [0.42, 1.78, 0.1, '#fda4af'], [-0.2, 1.7, -0.35, '#fbcfe8'], [0.25, 1.68, -0.3, '#ffffff'], [0.05, 1.62, 0.42, '#f472b6']]
    heads.forEach(([x, y, z, c]) => {
      g.add(mesh(new THREE.CylinderGeometry(0.025, 0.025, y - 0.6, 8), stem, [x * 0.5, (y + 0.6) / 2, z * 0.5], [z * 0.5, 0, -x * 0.5]))
      const head = new THREE.Group(); head.position.set(x, y, z); head.lookAt(x * 3, y + 2, z * 3 + 1.5)
      const petal = new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.55, sheen: 1, sheenColor: new THREE.Color('#ffffff'), side: THREE.DoubleSide })
      for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; head.add(mesh(new THREE.SphereGeometry(0.16, 16, 12), petal, [Math.cos(a) * 0.15, Math.sin(a) * 0.15, 0], [0, 0, a], [1.25, 0.75, 0.25])) }
      head.add(mesh(new THREE.SphereGeometry(0.08, 16, 12), new THREE.MeshStandardMaterial({ color: '#facc15', roughness: 0.7 }), [0, 0, 0.04]))
      g.add(head)
    })
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; g.add(mesh(new THREE.SphereGeometry(0.2, 12, 8), new THREE.MeshStandardMaterial({ color: '#65a30d', roughness: 0.6 }), [Math.cos(a) * 0.5, 1.5, Math.sin(a) * 0.5], [0, a, 0.6], [1.6, 0.3, 0.7])) }
    return g
  },
  bottle() {
    const g = new THREE.Group()
    g.add(mesh(new THREE.CylinderGeometry(0.4, 0.42, 1.5, 48), new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.08, transmission: 0, transparent: true, opacity: 0.55, clearcoat: 1 }), [0, 0.75, 0]))
    g.add(mesh(new THREE.CylinderGeometry(0.36, 0.38, 1.05, 48), new THREE.MeshStandardMaterial({ color: '#fffaf0', roughness: 0.5 }), [0, 0.55, 0]))
    g.add(mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.28, 48), phys('#93c5fd', { roughness: 0.25 }), [0, 1.6, 0]))
    const nip = [[0, 0], [0.3, 0], [0.3, 0.06], [0.14, 0.14], [0.12, 0.4], [0.07, 0.52], [0, 0.55]].map(([x, y]) => new THREE.Vector2(x, y))
    g.add(mesh(new THREE.LatheGeometry(nip, 48), new THREE.MeshPhysicalMaterial({ color: '#f6d6b8', roughness: 0.4, clearcoat: 0.5 }), [0, 1.74, 0]))
    for (let i = 0; i < 4; i++) g.add(mesh(new THREE.TorusGeometry(0.405, 0.008, 6, 48), new THREE.MeshStandardMaterial({ color: '#60a5fa' }), [0, 0.35 + i * 0.25, 0], [Math.PI / 2, 0, 0]))
    return g
  },
  rattle() {
    const g = new THREE.Group()
    g.add(mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.1, 24), phys('#86efac', { roughness: 0.3 }), [0, 0.55, 0]))
    g.add(mesh(new THREE.SphereGeometry(0.17, 24, 24), phys('#86efac'), [0, 0.02, 0]))
    g.add(mesh(new THREE.SphereGeometry(0.55, 48, 48), phys('#fde68a', { roughness: 0.25 }), [0, 1.55, 0]))
    g.add(mesh(new THREE.TorusGeometry(0.56, 0.06, 16, 64), phys('#f472b6'), [0, 1.55, 0], [Math.PI / 2, 0, 0]))
    g.add(mesh(new THREE.TorusGeometry(0.22, 0.05, 16, 48), phys('#c4b5fd'), [0, 0.95, 0], [Math.PI / 2, 0, 0]))
    return g
  },
  booties() {
    const g = new THREE.Group()
    const knit = new THREE.MeshPhysicalMaterial({ color: '#bae6fd', roughness: 0.85, sheen: 1, sheenColor: new THREE.Color('#ffffff'), sheenRoughness: 0.6 })
    const cuff = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.8, sheen: 1, sheenColor: new THREE.Color('#e0f2fe') })
    for (const [x, ry] of [[-0.42, 0.25], [0.42, -0.15]]) {
      const b = new THREE.Group(); b.position.x = x; b.rotation.y = ry
      b.add(mesh(new THREE.SphereGeometry(0.42, 32, 24), knit, [0, 0.24, 0.22], [0, 0, 0], [0.8, 0.55, 1.35]))
      b.add(mesh(new THREE.CylinderGeometry(0.3, 0.33, 0.55, 32), knit, [0, 0.5, -0.12]))
      b.add(mesh(new THREE.TorusGeometry(0.31, 0.08, 16, 48), cuff, [0, 0.8, -0.12], [Math.PI / 2, 0, 0]))
      b.add(mesh(new THREE.SphereGeometry(0.07, 16, 12), cuff, [0, 0.55, 0.55]))
      g.add(b)
    }
    return g
  },
}

// ---------------------------------------------------------------- the renderer

export function create3D(W, H) {
  const canvas = document.createElement('canvas')
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(1); renderer.setSize(W, H, false)
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.88; renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.setClearColor(0x000000, 0)

  const scene = new THREE.Scene()
  // A soft studio, like the hero: a room of light panels plus a pink and a blue side light.
  const pmrem = new THREE.PMREMGenerator(renderer)
  const room = new RoomEnvironment()
  const panel = (color, k, pos, rotY) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), side: THREE.DoubleSide })); m.position.set(...pos); m.rotation.y = rotY; room.add(m) }
  panel('#f9a8d4', 3, [-4.5, 1, 1], Math.PI / 2); panel('#93c5fd', 3, [4.5, 0, 0], -Math.PI / 2)
  scene.environment = pmrem.fromScene(room, 0.04).texture
  scene.environmentIntensity = 0.55
  scene.add(new THREE.AmbientLight('#ffffff', 0.35))
  const key = new THREE.DirectionalLight('#fff6f0', 1.6); key.position.set(4, 6, 5); scene.add(key)
  const rim = new THREE.DirectionalLight('#c4b5fd', 0.6); rim.position.set(-5, 2, -3); scene.add(rim)

  const D = H / 2 / Math.tan(((FOV / 2) * Math.PI) / 180)
  const camera = new THREE.PerspectiveCamera(FOV, W / H, 10, D * 6)
  camera.position.set(0, 0, D); camera.lookAt(0, 0, 0)

  const pools = {}
  function take(kind, variant, used) {
    const key = kind + ':' + (variant ?? '')
    const pool = (pools[key] ??= [])
    const i = (used[key] = (used[key] ?? 0) + 1) - 1
    if (!pool[i]) {
      const obj = kind === 'gift' ? buildGift(...variant.split('|')) : BUILD[kind](variant || undefined)
      obj.traverse((m) => { if (m.material) m.userData.baseOpacity = m.material.opacity ?? 1 })
      scene.add(obj); pool[i] = obj
    }
    return pool[i]
  }

  function setAlpha(obj, a) {
    if (obj.userData.alpha === a) return
    obj.userData.alpha = a
    obj.traverse((m) => {
      if (!m.material) return
      const was = m.material.transparent
      m.material.transparent = a < 1 || m.userData.baseOpacity < 1
      m.material.opacity = m.userData.baseOpacity * a
      if (was !== m.material.transparent) m.material.needsUpdate = true
    })
  }

  /** list: [{kind, variant, sx, sy, z, size, rx, ry, rz, open, squash, alpha, t}] in device pixels. */
  function render(list) {
    for (const pool of Object.values(pools)) for (const o of pool) o.visible = false
    const used = {}
    for (const it of list) {
      const variant = it.kind === 'gift' ? `${it.color}|${it.ribbon}` : it.variant
      const o = take(it.kind, variant, used)
      o.visible = true
      const k = (D + it.z) / D
      const s = it.size / 2, sq = it.squash ?? 0
      o.scale.set(s * (1 + sq * 0.6), s * (1 - sq), s * (1 + sq * 0.6))
      const baseUp = (o.userData.baseY ?? 0) * s * (1 - sq)
      o.position.set((it.sx - W / 2) * k, -(it.sy - H / 2) * k + baseUp, -it.z)
      o.rotation.set(-(it.rx ?? -0.3), it.ry ?? 0, it.rz ?? 0)
      if (o.userData.lid) {
        const open = it.open ?? 0, lid = o.userData.lid
        lid.visible = open < 0.98
        lid.position.set(open * 1.8, 0.86 + open * 4.4, -open * 0.9)
        lid.rotation.set(-open * 1.4, 0, -open * 0.8)
      }
      // flames flicker
      if (it.t !== undefined) o.traverse((m) => { if (m.userData.flame) { const b = (m.userData.base ??= m.scale.x), f = 1 + 0.12 * Math.sin(it.t * 23 + m.position.x * 40) + 0.06 * Math.sin(it.t * 37 + m.position.z * 30); m.scale.set(b, b * f, b) } })
      setAlpha(o, it.alpha ?? 1)
    }
    renderer.render(scene, camera)
    return canvas
  }
  return { render, canvas }
}
