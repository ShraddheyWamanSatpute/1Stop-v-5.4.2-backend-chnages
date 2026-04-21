import * as React from "react"

export type PreloadableLazy<T extends React.ComponentType<any>> =
  React.LazyExoticComponent<T> & {
    preload: () => Promise<{ default: T }>
  }

export function lazyWithPreload<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
): PreloadableLazy<T> {
  const Component = React.lazy(factory) as PreloadableLazy<T>
  Component.preload = factory
  return Component
}

