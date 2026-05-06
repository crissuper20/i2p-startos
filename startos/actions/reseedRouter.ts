import * as http from 'http'
import { i18n } from '../i18n'
import { sdk } from '../sdk'

const { InputSpec } = sdk

/**
 * Fetches the i2pd webconsole main page and parses the known router count.
 * Returns the count, or null if the page can't be reached or parsed.
 */
function fetchRouterCount(): Promise<number | null> {
  return new Promise((resolve) => {
    const req = http.request(
      { host: '127.0.0.1', port: 7070, path: '/', method: 'GET' },
      (res) => {
        let body = ''
        res.setEncoding('utf8')
        res.on('data', (chunk) => {
          body += chunk
        })
        res.on('end', () => {
          // i2pd webconsole: <b>Routers:</b> 2500
          const match = body.match(/Routers:<\/b>\s*(\d+)/i)
          resolve(match ? Number(match[1]) : null)
        })
      },
    )
    req.setTimeout(5000, () => {
      req.destroy()
      resolve(null)
    })
    req.on('error', () => resolve(null))
    req.end()
  })
}

/**
 * Fetches token + available command names from i2pd's command page.
 */
function fetchConsoleInfo(): Promise<{
  token: string | null
  commands: Set<string>
}> {
  return new Promise((resolve) => {
    const req = http.request(
      { host: '127.0.0.1', port: 7070, path: '/?page=commands', method: 'GET' },
      (res) => {
        let body = ''
        res.setEncoding('utf8')
        res.on('data', (chunk) => {
          body += chunk
        })
        res.on('end', () => {
          const tokenMatch = body.match(/token=(\d+)/)
          const commands = new Set<string>()
          for (const m of body.matchAll(/cmd=([a-z_]+)/g)) {
            commands.add(m[1])
          }
          resolve({
            token: tokenMatch ? tokenMatch[1] : null,
            commands,
          })
        })
      },
    )
    req.setTimeout(5000, () => {
      req.destroy()
      resolve({ token: null, commands: new Set<string>() })
    })
    req.on('error', () => resolve({ token: null, commands: new Set<string>() }))
    req.end()
  })
}

export const reseedRouter = sdk.Action.withInput(
  'reseed-router',

  async () => ({
    name: i18n('Reseed Router'),
    description: i18n(
      'Re-download router information from reseed servers',
    ),
    warning: null,
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  }),

  InputSpec.of({}),

  async () => null,

  async () => {
    const beforeCount = await fetchRouterCount()

    // i2pd's web console requires a per-session CSRF token for all commands.
    // Without it the server rejects the request and closes the socket,
    // producing the misleading "socket hang up" error that surfaced previously.
    const consoleInfo = await fetchConsoleInfo()
    const token = consoleInfo.token
    if (!token) {
      throw new Error(
        i18n('Could not fetch console token — is i2pd running?'),
      )
    }

    // i2pd command names vary across versions/builds.
    const reseedCmd =
      ['run_reseed', 'reseed', 'force_reseed'].find((cmd) =>
        consoleInfo.commands.has(cmd),
      ) ?? null
    if (!reseedCmd) {
      throw new Error('This i2pd build does not expose a reseed command')
    }

    // The request blocks until reseed finishes; this can take 60–120 seconds
    // on a slow connection.
    await new Promise<void>((resolve, reject) => {
      const req = http.request(
        {
          host: '127.0.0.1',
          port: 7070,
          path: `/?cmd=${reseedCmd}&token=${token}`,
          method: 'GET',
        },
        (res) => {
          res.resume()
          if (res.statusCode === 200 || res.statusCode === 302) {
            resolve()
          } else {
            reject(
              new Error(`Reseed returned HTTP ${res.statusCode}`),
            )
          }
        },
      )
      req.setTimeout(180000, () => {
        req.destroy()
        reject(new Error('Reseed request timed out'))
      })
      req.on('error', (e) => {
        reject(new Error(`Reseed failed: ${e.message}`))
      })
      req.end()
    })

    // Report the current count at the time of the request. i2pd integrates
    // new router infos in the background over 30–60 seconds; there is no
    // point waiting here — the count will rise on its own.
    const countStr =
      beforeCount !== null
        ? ` ${i18n('Known routers')}: ${beforeCount}.`
        : ''

    return {
      version: '1' as const,
      title: i18n('Reseed Results'),
      message: `${i18n('Reseed successful')}.${countStr}`,
      result: null,
    }
  },
)
