import { supabase } from './supabaseClient.js'

// Horse owners get no direct write access to horses/feeding_plans/payments —
// this RPC is the only way they can log a billable extra against their own
// horse. The amount is always computed server-side from the trusted price
// list price, never taken from the client. See the log_horse_extra()
// migration for the full merge-into-open-invoice/create-new-invoice logic.
export async function logHorseExtra({ horseId, priceListItemId, quantity, date }) {
  const { data, error } = await supabase.rpc('log_horse_extra', {
    p_horse_id: horseId,
    p_price_list_item_id: priceListItemId,
    p_quantity: quantity,
    p_date: date,
  })
  if (error) throw new Error(error.message)
  return data
}
