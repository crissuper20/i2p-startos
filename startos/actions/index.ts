import { sdk } from '../sdk'
import { addOnionService } from './addOnionService'
import { deleteOnionService } from './deleteOnionService'
import { configureRelay } from './configureRelay'
import { migrateOnionAddresses } from './migrateOnionAddresses'

export const actions = sdk.Actions.of()
  .addAction(addOnionService)
  .addAction(deleteOnionService)
  .addAction(configureRelay)
  .addAction(migrateOnionAddresses)
