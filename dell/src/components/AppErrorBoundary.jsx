import { Component } from 'react'
import SetupErrorPage from './SetupErrorPage'
import { classifySetupError } from '../lib/setupErrors'

export default class AppErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[carebridge] uncaught render error:', error, info)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    const classified = classifySetupError(error)

    return (
      <SetupErrorPage
        classified={{
          ...classified,
          title: classified.title || 'Application error',
          message: error?.message || classified.message,
        }}
        onRetry={() => this.setState({ error: null })}
      />
    )
  }
}
