import { sdk } from '../sdk'
import { manageOnionServices } from './manageOnionServices'
import { viewOnionAddresses } from './viewOnionAddresses'
import { configureRelay } from './configureRelay'

export const actions = sdk.Actions.of()
  .addAction(manageOnionServices)
  .addAction(viewOnionAddresses)
  .addAction(configureRelay)
