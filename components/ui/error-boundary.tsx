"use client"

import React from "react"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"

type ErrorBoundaryState = {
  hasError: boolean
  error?: Error | null
  resetKey: number
}

type Props = {
  children: React.ReactNode
  title?: string
}

export class ErrorBoundary extends React.Component<Props, ErrorBoundaryState> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, resetKey: Date.now() }
  }

  static getDerivedStateFromError(_error: Error) {
    return { hasError: true } as Partial<ErrorBoundaryState>
  }

  componentDidCatch(error: unknown, info: unknown) {
    try {
      logProductionRuntimeError("client-error-boundary", error, { info })
    } catch (_) {
      // swallow
    }
    // store minimal error for internal diagnostics but do not expose to users
    this.setState({
      error: error instanceof Error ? error : new Error("Unknown error"),
    })
  }

  reset = () => {
    this.setState({ hasError: false, error: null, resetKey: Date.now() })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6">
          <div className="max-w-xl mx-auto rounded-lg border border-border/60 bg-background p-6 text-center">
            <h2 className="text-lg font-semibold">Something went wrong</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              We encountered an error while loading this section. You can try
              again or contact support.
            </p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <button
                onClick={this.reset}
                className="px-4 py-2 rounded bg-primary text-black font-medium"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      )
    }

    return (
      <React.Fragment key={this.state.resetKey}>
        {this.props.children}
      </React.Fragment>
    )
  }
}

export default ErrorBoundary
