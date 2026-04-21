import React from "react"
import SectionLoadingScreen from "./SectionLoadingScreen"
import { useSectionLoading } from "../../hooks/useSectionLoading"

interface SectionLoadingWrapperProps {
  children: React.ReactNode
  isLoading?: boolean
  dataLoaded?: boolean
  posLoading?: boolean
  hrLoading?: boolean
  financeLoading?: boolean
  stockLoading?: boolean
  section?: string
  loadingMessage?: string
}

/**
 * Wrapper component that automatically shows section-specific loading screen
 * when UI/data is not yet loaded, otherwise renders children
 */
const SectionLoadingWrapper: React.FC<SectionLoadingWrapperProps> = ({
  children,
  isLoading: explicitIsLoading,
  dataLoaded,
  posLoading,
  hrLoading,
  financeLoading,
  stockLoading,
  section,
  loadingMessage,
}) => {
  const { isLoading, section: detectedSection } = useSectionLoading({
    isLoading: explicitIsLoading,
    dataLoaded,
    posLoading,
    hrLoading,
    financeLoading,
    stockLoading,
  })

  if (isLoading) {
    return (
      <SectionLoadingScreen
        section={section || detectedSection}
        message={loadingMessage}
      />
    )
  }

  return <>{children}</>
}

export default SectionLoadingWrapper
