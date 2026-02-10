import { i18n } from './i18n'
import { sdk } from './sdk'

const socksPort = 9050

export const setInterfaces = sdk.setupInterfaces(async ({ effects }) => {
  const socksMulti = sdk.MultiHost.of(effects, 'socks-multi')
  const socksOrigin = await socksMulti.bindPort(socksPort, {
    protocol: null,
    preferredExternalPort: socksPort,
    addSsl: null,
    secure: null,
  })

  const socksInterface = sdk.createInterface(effects, {
    name: i18n('Tor SOCKS Proxy'),
    id: 'socks',
    description: i18n('SOCKS5 proxy for private browsing'),
    type: 'api',
    masked: false,
    schemeOverride: null,
    username: null,
    path: '',
    query: {},
  })

  const receipt = await socksOrigin.export([socksInterface])
  return [receipt]
})
