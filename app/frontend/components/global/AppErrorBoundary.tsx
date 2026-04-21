import React from "react"
import { IconButton } from "@mui/material"
import RefreshIcon from "@mui/icons-material/Refresh"
import BrandedAppLoader from "./BrandedAppLoader"
import { themeConfig } from "../../../theme/AppTheme"

type Props = {
  children: React.ReactNode
}

type State = {
  hasError: boolean
}

/**
 * Catches render-time React errors so we show a fallback UI
 * instead of crashing to a blank screen.
 */
export default class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: unknown, errorInfo: unknown) {
    // Keep console logging for dev + production debugging.
    console.error("App crashed (caught by ErrorBoundary):", error, errorInfo)
  }

  private handleRefresh = () => {
    // Hard-navigate so the entire React tree is recreated cleanly.
    window.location.assign("/")
  }

  render() {
    if (this.state.hasError) {
      return (
        <>
          {/* Background matches top bar (primary.main) */}
          <BrandedAppLoader message="Something went wrong">
            <IconButton
              aria-label="Refresh"
              title="Refresh"
              onClick={this.handleRefresh}
              sx={{
                mt: 1,
                color: themeConfig.brandColors.offWhite,
              }}
            >
              <RefreshIcon />
            </IconButton>
          </BrandedAppLoader>
        </>
      )
    }

    return this.props.children
  }
}

