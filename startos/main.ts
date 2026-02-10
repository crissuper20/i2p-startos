import { writeFile, mkdir } from 'node:fs/promises'
import { i18n } from './i18n'
import { sdk } from './sdk'
import { storeJson } from './fileModels/store.json'
import { generateTorrc } from './utils'

const socksPort = 9050

export const main = sdk.setupMain(async ({ effects }) => {
  console.info('Starting Tor!')

  const store = await storeJson.read((s) => s).const(effects)

  const torSub = await sdk.SubContainer.of(
    effects,
    { imageId: 'tor' },
    sdk.Mounts.of().mountVolume({
      volumeId: 'tor',
      subpath: null,
      mountpoint: '/var/lib/tor',
      readonly: false,
    }),
    'tor-sub',
  )

  // Write custom private keys for onion services that have them
  const onionServices = store?.onionServices || {}
  for (const [name, svc] of Object.entries(onionServices)) {
    if (svc.privateKey) {
      const keyDir = `hs_${name}`
      await sdk.volumes.tor.writeFile(
        `${keyDir}/hs_ed25519_secret_key`,
        Buffer.from(svc.privateKey, 'base64'),
      )
    }
  }

  // Generate and write torrc to subcontainer rootfs
  const torrc = generateTorrc(store || { onionServices: {}, relay: undefined })
  await writeFile(`${torSub.rootfs}/etc/tor/torrc`, torrc)

  return sdk.Daemons.of(effects).addDaemon('tor', {
    subcontainer: torSub,
    exec: {
      command: sdk.useEntrypoint(),
    },
    ready: {
      display: i18n('Tor SOCKS Proxy'),
      fn: () =>
        sdk.healthCheck.checkPortListening(effects, socksPort, {
          successMessage: i18n('Tor is running'),
          errorMessage: i18n('Tor is not ready'),
        }),
    },
    requires: [],
  })
})
