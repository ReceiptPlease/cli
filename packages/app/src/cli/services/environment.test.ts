import {fetchAppFromApiKey, fetchOrgAndApps, fetchOrganizations} from './dev/fetch'
import {selectOrCreateApp} from './dev/select-app'
import {selectStore, convertToTestStoreIfNeeded} from './dev/select-store'
import {ensureDeploymentIdsPresence} from './environment/identifiers'
import {DevEnvironmentOptions, ensureDevEnvironment, ensureDeployEnvironment, DeployAppNotFound} from './environment'
import {OrganizationApp, OrganizationStore} from '../models/organization'
import {App, WebType, updateAppIdentifiers, getAppIdentifiers, UIExtension} from '../models/app/app'
import {reuseDevConfigPrompt, selectOrganizationPrompt} from '../prompts/dev'
import {testApp} from '../models/app/app.test-data'
import {store as conf, api} from '@shopify/cli-kit'
import {beforeEach, describe, expect, it, test, vi} from 'vitest'
import {outputMocker} from '@shopify/cli-testing'

beforeEach(() => {
  vi.mock('./dev/fetch')
  vi.mock('./dev/select-app')
  vi.mock('./dev/select-store')
  vi.mock('../prompts/dev')
  vi.mock('../models/app/app')
  vi.mock('./environment/identifiers')
  vi.mock('@shopify/cli-kit', async () => {
    const cliKit: any = await vi.importActual('@shopify/cli-kit')
    return {
      ...cliKit,
      session: {
        ensureAuthenticatedPartners: () => 'token',
      },
      api: {
        partners: {
          request: vi.fn(),
        },
        graphql: cliKit.api.graphql,
      },
      store: {
        setAppInfo: vi.fn(),
        getAppInfo: vi.fn(),
        clearAppInfo: vi.fn(),
      },
    }
  })
})

const APP1: OrganizationApp = {
  id: '1',
  title: 'app1',
  apiKey: 'key1',
  organizationId: '1',
  apiSecretKeys: [{secret: 'secret1'}],
}
const APP2: OrganizationApp = {
  id: '2',
  title: 'app2',
  apiKey: 'key2',
  organizationId: '1',
  apiSecretKeys: [{secret: 'secret2'}],
}

const ORG1: api.graphql.AllOrganizationsQuerySchemaOrganization = {
  id: '1',
  businessName: 'org1',
  appsNext: true,
  website: '',
}
const ORG2: api.graphql.AllOrganizationsQuerySchemaOrganization = {
  id: '2',
  businessName: 'org2',
  appsNext: false,
  website: '',
}

const CACHED1: conf.CachedAppInfo = {appId: 'key1', orgId: '1', storeFqdn: 'domain1', directory: '/cached'}
const STORE1: OrganizationStore = {
  shopId: '1',
  link: 'link1',
  shopDomain: 'domain1',
  shopName: 'store1',
  transferDisabled: false,
  convertableToPartnerTest: false,
}
const STORE2: OrganizationStore = {
  shopId: '2',
  link: 'link2',
  shopDomain: 'domain2',
  shopName: 'store2',
  transferDisabled: false,
  convertableToPartnerTest: false,
}
const EXTENSION_A: UIExtension = {
  idEnvironmentVariableName: 'EXTENSION_A_ID',
  localIdentifier: 'EXTENSION_A',
  configurationPath: '',
  directory: '',
  type: 'checkout_post_purchase',
  graphQLType: 'CHECKOUT_POST_PURCHASE',
  configuration: {name: '', type: 'checkout_post_purchase', metafields: []},
  buildDirectory: '',
  entrySourceFilePath: '',
  devUUID: 'devUUID',
}

const LOCAL_APP: App = {
  name: 'my-app',
  idEnvironmentVariableName: 'SHOPIFY_API_KEY',
  directory: '/app',
  dependencyManager: 'yarn',
  configurationPath: '/shopify.app.toml',
  configuration: {scopes: 'read_products'},
  webs: [
    {
      directory: '',
      configuration: {
        type: WebType.Backend,
        commands: {dev: ''},
      },
    },
  ],
  nodeDependencies: {},
  extensions: {ui: [EXTENSION_A], theme: [], function: []},
}

const INPUT: DevEnvironmentOptions = {
  app: LOCAL_APP,
  reset: false,
}

const INPUT_WITH_DATA: DevEnvironmentOptions = {
  app: LOCAL_APP,
  reset: false,
  apiKey: 'key1',
  storeFqdn: 'domain1',
}

const FETCH_RESPONSE = {
  organization: ORG1,
  apps: [APP1, APP2],
  stores: [STORE1, STORE2],
}

beforeEach(async () => {
  vi.mocked(getAppIdentifiers).mockResolvedValue({app: undefined})
  vi.mocked(selectOrganizationPrompt).mockResolvedValue(ORG1)
  vi.mocked(selectOrCreateApp).mockResolvedValue(APP1)
  vi.mocked(selectStore).mockResolvedValue(STORE1.shopDomain)
  vi.mocked(fetchOrganizations).mockResolvedValue([ORG1, ORG2])
  vi.mocked(fetchOrgAndApps).mockResolvedValue(FETCH_RESPONSE)
})

describe('ensureDevEnvironment', () => {
  it('returns selected data and updates internal state, without cached state', async () => {
    // Given
    vi.mocked(conf.getAppInfo).mockReturnValue(undefined)
    vi.mocked(updateAppIdentifiers).mockResolvedValue(LOCAL_APP)

    // When
    const got = await ensureDevEnvironment(INPUT)

    // Then
    expect(got).toEqual({
      app: {...APP1, apiSecret: 'secret1'},
      storeFqdn: STORE1.shopDomain,
      identifiers: {
        app: 'key1',
        extensions: {},
      },
    })
    expect(conf.setAppInfo).toHaveBeenNthCalledWith(1, {
      appId: APP1.apiKey,
      title: APP1.title,
      directory: LOCAL_APP.directory,
      orgId: ORG1.id,
    })
    expect(conf.setAppInfo).toHaveBeenNthCalledWith(2, {
      appId: APP1.apiKey,
      directory: LOCAL_APP.directory,
      storeFqdn: STORE1.shopDomain,
    })
    expect(updateAppIdentifiers).toBeCalledWith({
      app: LOCAL_APP,
      identifiers: {
        app: APP1.apiKey,
        extensions: {},
      },
      command: 'dev',
    })
  })

  it('returns selected data and updates internal state, with cached state', async () => {
    // Given
    const outputMock = outputMocker.mockAndCapture()
    vi.mocked(conf.getAppInfo).mockReturnValue(CACHED1)
    vi.mocked(getAppIdentifiers).mockResolvedValue({
      app: 'key1',
      extensions: {},
    })
    vi.mocked(updateAppIdentifiers).mockResolvedValue(LOCAL_APP)

    // When
    const got = await ensureDevEnvironment(INPUT)

    // Then
    expect(got).toEqual({
      app: {...APP1, apiSecret: 'secret1'},
      storeFqdn: STORE1.shopDomain,
      identifiers: {
        app: 'key1',
        extensions: {},
      },
    })
    expect(fetchOrganizations).not.toBeCalled()
    expect(selectOrganizationPrompt).not.toBeCalled()
    expect(conf.setAppInfo).toHaveBeenNthCalledWith(1, {
      appId: APP1.apiKey,
      title: APP1.title,
      directory: LOCAL_APP.directory,
      orgId: ORG1.id,
    })
    expect(conf.setAppInfo).toHaveBeenNthCalledWith(2, {
      appId: APP1.apiKey,
      directory: LOCAL_APP.directory,
      storeFqdn: STORE1.shopDomain,
    })
    expect(updateAppIdentifiers).toBeCalledWith({
      app: LOCAL_APP,
      identifiers: {
        app: APP1.apiKey,
        extensions: {},
      },
      command: 'dev',
    })
    expect(outputMock.output()).toMatch(/Using your previous dev settings:/)
  })

  it('returns extensions Ids if the selected app matches the env one', async () => {
    // Given
    vi.mocked(getAppIdentifiers).mockResolvedValue({
      app: 'key1',
      extensions: {EXTENSION_A: 'UUID_EXTENSION_A'},
    })
    vi.mocked(updateAppIdentifiers).mockResolvedValue(LOCAL_APP)

    // When
    const got = await ensureDevEnvironment(INPUT)

    // Then
    expect(got).toEqual({
      app: {...APP1, apiSecret: 'secret1'},
      storeFqdn: STORE1.shopDomain,
      identifiers: {
        app: 'key1',
        extensions: {EXTENSION_A: 'UUID_EXTENSION_A'},
      },
    })
  })

  it('ignores extensions Ids if the selected app does not match the env one', async () => {
    // Given
    vi.mocked(getAppIdentifiers).mockResolvedValue({
      app: 'env-app',
      extensions: {EXTENSION_A: 'UUID_EXTENSION_A'},
    })
    vi.mocked(updateAppIdentifiers).mockResolvedValue(LOCAL_APP)

    // When
    const got = await ensureDevEnvironment(INPUT)

    // Then
    expect(got).toEqual({
      app: {...APP1, apiSecret: 'secret1'},
      storeFqdn: STORE1.shopDomain,
      identifiers: {
        app: 'key1',
        extensions: {},
      },
    })
  })

  it('returns selected data and updates internal state, with inputs from flags', async () => {
    // Given
    vi.mocked(conf.getAppInfo).mockReturnValue(undefined)
    vi.mocked(convertToTestStoreIfNeeded).mockResolvedValueOnce()
    vi.mocked(fetchAppFromApiKey).mockResolvedValueOnce(APP2)
    vi.mocked(updateAppIdentifiers).mockResolvedValue(LOCAL_APP)

    // When
    const got = await ensureDevEnvironment(INPUT_WITH_DATA)

    // Then
    expect(got).toEqual({
      app: {...APP2, apiSecret: 'secret2'},
      storeFqdn: STORE1.shopDomain,
      identifiers: {
        app: 'key2',
        extensions: {},
      },
    })
    expect(conf.setAppInfo).toHaveBeenNthCalledWith(1, {
      appId: APP2.apiKey,
      directory: LOCAL_APP.directory,
      storeFqdn: STORE1.shopDomain,
      orgId: ORG1.id,
    })
    expect(updateAppIdentifiers).toBeCalledWith({
      app: LOCAL_APP,
      identifiers: {
        app: APP2.apiKey,
        extensions: {},
      },
      command: 'dev',
    })

    expect(fetchOrganizations).toBeCalled()
    expect(selectOrganizationPrompt).toBeCalled()
    expect(selectOrCreateApp).not.toBeCalled()
    expect(selectStore).not.toBeCalled()
  })

  it('resets cached state if reset is true', async () => {
    // When
    vi.mocked(conf.getAppInfo).mockReturnValue({
      appId: APP1.apiKey,
      directory: LOCAL_APP.directory,
    })
    vi.mocked(updateAppIdentifiers).mockResolvedValue(LOCAL_APP)
    await ensureDevEnvironment({...INPUT, reset: true})

    // Then
    expect(conf.clearAppInfo).toHaveBeenCalledWith(LOCAL_APP.directory)
  })
})

describe('ensureDeployEnvironment', () => {
  test("fetches the app from the partners' API and returns it alongside the id when identifiers are available locally and the app has no extensions", async () => {
    // Given
    const app = testApp()
    const identifiers = {
      app: APP2.apiKey,
      extensions: {},
      extensionIds: {},
    }
    vi.mocked(getAppIdentifiers).mockResolvedValue({app: APP2.apiKey})
    vi.mocked(fetchAppFromApiKey).mockResolvedValueOnce(APP2)
    vi.mocked(ensureDeploymentIdsPresence).mockResolvedValue(identifiers)

    // When
    const got = await ensureDeployEnvironment({app, reset: false})

    // Then
    expect(selectOrCreateApp).not.toHaveBeenCalled()
    expect(got.partnersApp.id).toEqual(APP2.id)
    expect(got.partnersApp.title).toEqual(APP2.title)
    expect(got.partnersApp.appType).toEqual(APP2.appType)
    expect(got.identifiers).toEqual(identifiers)
  })

  test("fetches the app from the partners' API and returns it alongside the id when there are no identifiers but user chooses to reuse dev config", async () => {
    // Given
    const app = testApp()
    const identifiers = {
      app: APP2.apiKey,
      extensions: {},
      extensionIds: {},
    }
    vi.mocked(getAppIdentifiers).mockResolvedValue({app: undefined})
    vi.mocked(conf.getAppInfo).mockReturnValue(CACHED1)
    vi.mocked(fetchAppFromApiKey).mockResolvedValueOnce(APP2)
    vi.mocked(ensureDeploymentIdsPresence).mockResolvedValue(identifiers)
    vi.mocked(reuseDevConfigPrompt).mockResolvedValueOnce(true)

    // When
    const got = await ensureDeployEnvironment({app, reset: false})

    // Then
    expect(selectOrCreateApp).not.toHaveBeenCalled()
    expect(reuseDevConfigPrompt).toHaveBeenCalled()
    expect(got.partnersApp.id).toEqual(APP2.id)
    expect(got.partnersApp.title).toEqual(APP2.title)
    expect(got.partnersApp.appType).toEqual(APP2.appType)
    expect(got.identifiers).toEqual(identifiers)
  })

  test('prompts the user to create or select an app and returns it with its id when the app has no extensions', async () => {
    // Given
    const app = testApp()
    const identifiers = {
      app: APP1.apiKey,
      extensions: {},
      extensionIds: {},
    }
    vi.mocked(getAppIdentifiers).mockResolvedValue({app: undefined})
    vi.mocked(fetchAppFromApiKey).mockResolvedValueOnce(APP2)
    vi.mocked(ensureDeploymentIdsPresence).mockResolvedValue(identifiers)
    // When
    const got = await ensureDeployEnvironment({app, reset: false})

    // Then
    expect(fetchOrganizations).toHaveBeenCalledWith('token')
    expect(selectOrCreateApp).toHaveBeenCalledWith(app, [APP1, APP2], ORG1, 'token', undefined)
    expect(updateAppIdentifiers).toBeCalledWith({
      app,
      identifiers,
      command: 'deploy',
    })
    expect(got.partnersApp.id).toEqual(APP1.id)
    expect(got.partnersApp.title).toEqual(APP1.title)
    expect(got.partnersApp.appType).toEqual(APP1.appType)
    expect(got.identifiers).toEqual({app: APP1.apiKey, extensions: {}, extensionIds: {}})
  })

  test("throws a AppOrganizationNotFoundError error if the app with the API key doesn't exist", async () => {
    // Given
    const app = testApp()
    vi.mocked(getAppIdentifiers).mockResolvedValue({app: APP1.apiKey})
    vi.mocked(fetchAppFromApiKey).mockResolvedValueOnce(undefined)

    // When
    await expect(ensureDeployEnvironment({app, reset: false})).rejects.toThrow(
      DeployAppNotFound(APP1.apiKey, LOCAL_APP.dependencyManager),
    )
  })

  test('prompts the user to create or select an app if reset is true', async () => {
    // Given
    const app = testApp()
    const identifiers = {
      app: APP1.apiKey,
      extensions: {},
      extensionIds: {},
    }

    // There is a cached app but it will be ignored
    vi.mocked(getAppIdentifiers).mockResolvedValue({app: APP2.apiKey})
    vi.mocked(fetchAppFromApiKey).mockResolvedValueOnce(APP2)
    vi.mocked(ensureDeploymentIdsPresence).mockResolvedValue(identifiers)

    // When
    const got = await ensureDeployEnvironment({app, reset: true})

    // Then
    expect(fetchOrganizations).toHaveBeenCalledWith('token')
    expect(selectOrCreateApp).toHaveBeenCalledWith(app, [APP1, APP2], ORG1, 'token', undefined)
    expect(updateAppIdentifiers).toBeCalledWith({
      app,
      identifiers,
      command: 'deploy',
    })
    expect(got.partnersApp.id).toEqual(APP1.id)
    expect(got.partnersApp.title).toEqual(APP1.title)
    expect(got.partnersApp.appType).toEqual(APP1.appType)
    expect(got.identifiers).toEqual({app: APP1.apiKey, extensions: {}, extensionIds: {}})
  })
})
