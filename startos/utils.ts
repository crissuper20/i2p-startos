import { shape } from './fileModels/store.json'

type Store = typeof shape._TYPE

export function generateTorrc(store: Store): string {
  const lines: string[] = [
    'SocksPort 0.0.0.0:9050',
    'DataDirectory /var/lib/tor',
    '',
  ]

  const onionServices = store.onionServices || {}

  for (const [name, svc] of Object.entries(onionServices)) {
    lines.push(`HiddenServiceDir /var/lib/tor/hs_${name}/`)

    const host =
      svc.packageId === 'startos' ? 'startos' : `${svc.packageId}.startos`

    lines.push(
      `HiddenServicePort ${svc.virtualPort} ${host}:${svc.virtualPort}`,
    )
    lines.push('')
  }

  const relay = store.relay
  if (relay?.enabled) {
    lines.push(`ORPort ${relay.orPort}`)
    if (relay.nickname) {
      lines.push(`Nickname ${relay.nickname}`)
    }
    if (relay.contactInfo) {
      lines.push(`ContactInfo ${relay.contactInfo}`)
    }
    if (relay.bridge) {
      lines.push('BridgeRelay 1')
    }
    lines.push(`RelayBandwidthRate ${relay.bandwidthRate}`)
    lines.push(`RelayBandwidthBurst ${relay.bandwidthBurst}`)
    lines.push('ExitRelay 0')
    lines.push('')
  }

  return lines.join('\n')
}
