import { Component } from 'react'

/** Last line of defence: a render error shows a friendly message and a reload button instead of a blank screen. */
export default class ErrorBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error) {
    console.error(error)
  }

  render() {
    const { failed } = this.state
    const { message, reloadLabel, onReload = () => window.location.reload(), children } = this.props
    if (!failed) return children
    return (
      <div role="alert" className="mx-auto max-w-md p-6 text-center">
        <p className="text-lg font-semibold">{message}</p>
        <button type="button" onClick={onReload} className="mt-4 min-h-11 rounded-full bg-primary px-5 font-semibold text-lime">
          {reloadLabel}
        </button>
      </div>
    )
  }
}
