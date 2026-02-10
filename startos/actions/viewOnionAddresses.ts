import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'

export const viewOnionAddresses = sdk.Action.withoutInput(
  // id
  'view-onion-addresses',

  // metadata
  async ({ effects }) => {
    const store = await storeJson.read().const(effects)
    const onionServices = store?.onionServices || {}

    return {
      name: i18n('View Onion Addresses'),
      description: i18n('View the .onion addresses for your services'),
      warning: null,
      allowedStatuses: 'only-running',
      group: null,
      visibility: Object.keys(onionServices).length
        ? 'enabled'
        : { disabled: i18n('You have no onion services') },
    }
  },

  // execution function
  async ({ effects }) => {
    const store = await storeJson.read().once()
    const onionServices = store?.onionServices || {}

    const values = await Promise.all(
      Object.entries(onionServices).map(async ([name, svc]) => {
        let hostname = '<pending>'
        try {
          const content = await sdk.volumes.tor.readFile(`hs_${name}/hostname`)
          hostname = content.toString().trim()
        } catch {
          // hostname file doesn't exist yet (first run)
        }

        let displayName = name

        if (svc.packageId !== 'startos') {
          const title = await sdk
            .getServiceManifest(effects, svc.packageId, (m) => m?.title)
            .const()

          const ifaceName = await sdk.serviceInterface
            .get(
              effects,
              { id: svc.interfaceId, packageId: svc.packageId },
              (i) => i?.name || 'unknown',
            )
            .once()

          displayName = `${name} (${title} - ${ifaceName})`
        } else {
          displayName = `${name} (StartOS - UI)`
        }

        return {
          type: 'single' as const,
          name: displayName,
          description: null,
          value: hostname,
          masked: false,
          copyable: true,
          qr: true,
        }
      }),
    )

    return {
      version: '1' as const,
      title: i18n('Onion Addresses'),
      message: null,
      result: {
        type: 'group' as const,
        value: values,
      },
    }
  },
)
