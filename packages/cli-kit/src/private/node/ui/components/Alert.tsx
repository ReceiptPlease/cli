import {Banner, BannerType} from './Banner.js'
import {Link} from './Link.js'
import {List} from './List.js'
import {TokenItem, TokenizedText} from './TokenizedText.js'
import {Box, Text} from 'ink'
import React, {FunctionComponent} from 'react'

export interface CustomSection {
  title?: string
  body: TokenItem
}

export interface AlertProps {
  type: Exclude<BannerType, 'error' | 'external_error'>
  headline: TokenItem
  body?: TokenItem
  nextSteps?: TokenItem[]
  reference?: TokenItem[]
  link?: {
    label: string
    url: string
  }
  orderedNextSteps?: boolean
  customSections?: CustomSection[]
}

const Alert: FunctionComponent<AlertProps> = ({
  type,
  headline,
  body,
  nextSteps,
  reference,
  link,
  customSections,
  orderedNextSteps = false,
}) => {
  return (
    <Banner type={type}>
      <Box>
        <TokenizedText item={headline} />
      </Box>

      {body ? (
        <Box marginTop={1}>
          <TokenizedText item={body} />
        </Box>
      ) : null}

      {nextSteps && nextSteps.length > 0 ? (
        <Box marginTop={1}>
          <List title="Next steps" items={nextSteps} ordered={orderedNextSteps} />
        </Box>
      ) : null}

      {reference && reference.length > 0 ? (
        <Box marginTop={1}>
          <List title="Reference" items={reference} />
        </Box>
      ) : null}

      {link ? (
        <Box marginTop={1}>
          <Link url={link.url} label={link.label} />
        </Box>
      ) : null}

      {customSections && customSections.length > 0 ? (
        <Box flexDirection="column">
          {customSections.map((section, index) => (
            <Box key={index} flexDirection="column" marginTop={1}>
              {section.title ? <Text bold>{section.title}</Text> : null}
              <TokenizedText item={section.body} />
            </Box>
          ))}
        </Box>
      ) : null}
    </Banner>
  )
}

export {Alert}
