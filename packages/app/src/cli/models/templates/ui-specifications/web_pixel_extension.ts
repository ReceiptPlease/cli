import {TemplateSpecification} from '../../app/template.js'

/**
 * Web Pixel UI extension template specification.
 */
const webPixelUIExtension: TemplateSpecification = {
  identifier: 'web_pixel_extension',
  name: 'Web Pixel',
  group: 'Analytics',
  supportLinks: [],
  types: [
    {
      url: 'https://github.com/Shopify/cli',
      type: 'web_pixel_extension',
      extensionPoints: [],
      supportedFlavors: [
        {
          name: 'TypeScript',
          value: 'typescript',
          path: 'packages/app/templates/ui-extensions/projects/web_pixel_extension',
        },
        {
          name: 'JavaScript',
          value: 'vanilla-js',
          path: 'packages/app/templates/ui-extensions/projects/web_pixel_extension',
        },
        {
          name: 'TypeScript React',
          value: 'typescript-react',
          path: 'packages/app/templates/ui-extensions/projects/web_pixel_extension',
        },
        {
          name: 'JavaScript React',
          value: 'react',
          path: 'packages/app/templates/ui-extensions/projects/web_pixel_extension',
        },
      ],
    },
  ],
}

export default webPixelUIExtension
