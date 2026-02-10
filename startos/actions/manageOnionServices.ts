import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'

const { InputSpec, Value, List, Variants } = sdk

export const inputSpec = InputSpec.of({
  services: Value.list(
    List.obj(
      { name: i18n('Onion Services') },
      {
        displayAs: '{{name}} ({{service.selection}})',
        uniqueBy: { all: ['name'] },
        spec: InputSpec.of({
          name: Value.text({
            name: i18n('Name'),
            description: i18n(
              'A short, unique name for this onion service (e.g. my-bitcoin)',
            ),
            required: true,
            default: null,
            placeholder: 'my-service',
            patterns: [
              {
                regex: '^[a-zA-Z0-9][a-zA-Z0-9_-]*$',
                description:
                  'Must start with alphanumeric and contain only letters, numbers, hyphens, and underscores',
              },
            ],
            masked: false,
            inputmode: 'text',
            minLength: 1,
            maxLength: 64,
          }),
          service: Value.dynamicUnion(async ({ effects }) => {
            const packages = await sdk.getInstalledPackages(effects)

            const entries = await Promise.all(
              packages.map(async (packageId) => {
                const title =
                  (await sdk
                    .getServiceManifest(effects, packageId, (m) => m?.title)
                    .const()) ?? packageId

                const iFaces = await sdk.serviceInterface
                  .getAll(effects, { packageId }, (ifaces) =>
                    ifaces.map((i) => [i.id, i.name]),
                  )
                  .once()

                return getSpec(packageId, title, iFaces)
              }),
            )

            return {
              name: i18n('Service'),
              default: '',
              disabled: false,
              variants: Variants.of(
                Object.fromEntries(
                  [getSpec('startos', 'StartOS', [['ui', 'UI']])].concat(
                    entries,
                  ),
                ),
              ),
            }
          }),
          virtualPort: Value.number({
            name: i18n('Virtual Port'),
            description: i18n('The port number exposed on the .onion address'),
            required: false,
            default: 80,
            min: 1,
            max: 65535,
            integer: true,
            placeholder: null,
            units: null,
          }),
          privateKey: Value.textarea({
            name: i18n('Private Key (optional)'),
            description: i18n(
              'Base64-encoded ed25519 private key for a vanity .onion address. Leave blank to auto-generate.',
            ),
            required: false,
            default: null,
            placeholder: null,
            minLength: null,
            maxLength: null,
          }),
        }),
      },
    ),
  ),
})

export const manageOnionServices = sdk.Action.withInput(
  // id
  'manage-onion-services',

  // metadata
  async ({ effects }) => ({
    name: i18n('Manage Onion Services'),
    description: i18n('Add and remove Tor onion services'),
    warning: null,
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  }),

  // input spec
  inputSpec,

  // pre-fill form
  async ({ effects }) => {
    const store = await storeJson.read().once()
    const onionServices = store?.onionServices || {}

    return {
      services: Object.entries(onionServices).map(([name, svc]) => ({
        name,
        service: {
          selection: svc.packageId,
          value: {
            iface: svc.interfaceId,
          },
        },
        virtualPort: svc.virtualPort,
        privateKey: svc.privateKey || null,
      })),
    }
  },

  // execution function
  async ({ effects, input }) => {
    const store = await storeJson.read().once()

    const onionServices: Record<
      string,
      {
        packageId: string
        interfaceId: string
        virtualPort: number
        privateKey: string | undefined
      }
    > = {}

    input.services.forEach((entry) => {
      const { selection, value } = entry.service as {
        selection: string
        value: { iface: string }
      }

      onionServices[entry.name] = {
        packageId: selection,
        interfaceId: value.iface,
        virtualPort: entry.virtualPort ?? 80,
        privateKey: entry.privateKey || undefined,
      }
    })

    await storeJson.merge(effects, { onionServices })
  },
)

function getSpec(packageId: string, packageTitle: string, iFaces: string[][]) {
  return [
    packageId,
    {
      name: packageTitle,
      spec: InputSpec.of({
        iface: Value.select({
          name: i18n('Service Interface'),
          default: '',
          values: Object.fromEntries(iFaces),
        }),
      }),
    },
  ] as const
}
