import { FileHelper, matches } from '@start9labs/start-sdk'
import { sdk } from '../sdk'

const { object, string, number, boolean, dictionary } = matches

export const onionServiceShape = object({
  packageId: string,
  interfaceId: string,
  virtualPort: number.optional().onMismatch(80),
  privateKey: string.optional().onMismatch(undefined),
})

export const relayShape = object({
  enabled: boolean.optional().onMismatch(false),
  nickname: string.optional().onMismatch('StartOSRelay'),
  contactInfo: string.optional().onMismatch(''),
  bridge: boolean.optional().onMismatch(false),
  orPort: number.optional().onMismatch(9001),
  bandwidthRate: string.optional().onMismatch('1 MBytes'),
  bandwidthBurst: string.optional().onMismatch('2 MBytes'),
})

export const shape = object({
  onionServices: dictionary([string, onionServiceShape])
    .optional()
    .onMismatch({}),
  relay: relayShape.optional().onMismatch({
    enabled: false,
    nickname: 'StartOSRelay',
    contactInfo: '',
    bridge: false,
    orPort: 9001,
    bandwidthRate: '1 MBytes',
    bandwidthBurst: '2 MBytes',
  }),
})

export const storeJson = FileHelper.json(
  {
    base: sdk.volumes.startos,
    subpath: '/store.json',
  },
  shape,
)
