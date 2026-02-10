import { manageOnionServices } from '../actions/manageOnionServices'
import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'

export const taskAddOnionService = sdk.setupOnInit(async (effects, _) => {
  const store = await storeJson.read().const(effects)

  if (!Object.keys(store?.onionServices || {}).length) {
    await sdk.action.createOwnTask(effects, manageOnionServices, 'critical', {
      reason: i18n('Create your first onion service'),
    })
  }
})
