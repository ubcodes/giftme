import { Component, Suspense, lazy, type ReactNode } from 'react'
import type { SceneProps } from './gift-scene'

// The 3D gift is decoration. If its file fails to download (a flaky connection, or a deploy
// swapping files mid-visit), try once more, and if that fails too, the page carries on without it.
const load = () => import('./gift-scene')
export const preloadGiftScene = () => load().catch(() => {})
const Scene = lazy(() => load().catch(() => new Promise((r) => setTimeout(r, 1200)).then(load)))

class Quiet extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(err: unknown) {
    console.warn('[gift-scene] skipped:', err)
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

export function GiftScene(props: SceneProps) {
  return (
    <Quiet>
      <Suspense fallback={null}>
        <Scene {...props} />
      </Suspense>
    </Quiet>
  )
}
