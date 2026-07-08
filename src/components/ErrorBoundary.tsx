import { AlertTriangle } from 'lucide-react'
import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** Compact in-shell fallback that keeps the surrounding navigation usable. */
  inline?: boolean
}

interface State {
  error: Error | null
}

/**
 * Catches render/lifecycle errors anywhere below it so an uncaught exception
 * degrades to a recovery card instead of a blank white screen (US-082). The
 * fallback is deliberately non-destructive: it never clears stored data — a
 * transient render bug must not cost the user their log — it only offers a
 * reload (or, inline, an in-place retry) and points at More → Data to export or
 * restore.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Local console only — there is no remote logging (all data stays on-device).
    console.error('Unhandled render error:', error, info.componentStack)
  }

  reset = (): void => {
    this.setState({ error: null })
  }

  render(): ReactNode {
    const { error } = this.state
    if (error === null) return this.props.children
    return (
      <div
        role="alert"
        className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-10 text-center"
      >
        <AlertTriangle className="h-8 w-8 text-red-600" aria-hidden />
        <h1 className="text-lg font-bold">Something went wrong</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          The screen hit an unexpected error. Your saved data is untouched — nothing here deletes
          it.
        </p>
        <p className="max-w-full rounded-lg bg-zinc-100 px-3 py-2 font-mono text-xs break-words text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          {error.message || 'Unknown error'}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {this.props.inline ? (
            <button
              type="button"
              onClick={this.reset}
              className="min-h-11 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Try again
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="min-h-11 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Reload app
          </button>
        </div>
        <p className="text-xs text-zinc-400">
          If this keeps happening, open More → Data to export a backup or restore the last one.
        </p>
      </div>
    )
  }
}
