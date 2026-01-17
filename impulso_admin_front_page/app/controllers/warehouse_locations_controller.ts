import type { HttpContext } from '@adonisjs/core/http'
import WarehouseLocation from '#models/warehouse_location'
import InventoryWarehouse from '#models/inventory_warehouse'
import { getRestaurantId } from '#utils/restaurant'

export default class WarehouseLocationsController {
  public async index({ request }: HttpContext) {
    const restaurantId = getRestaurantId({ request } as any)
    const q = String(request.input('q') ?? '').trim()
    const warehouseId = Number(request.input('warehouseId') || 0)
    const isActive = request.input('isActive')

    const query = WarehouseLocation.query()
      .where('restaurantId', restaurantId)
      .preload('warehouse', (w) => w.select(['id', 'name', 'code']))
      .orderBy('name', 'asc')

    if (warehouseId) query.where('warehouseId', warehouseId)
    if (q) query.whereILike('name', `%${q}%`)
    if (isActive !== undefined) query.where('isActive', String(isActive) === 'true')

    return query
  }

  public async store({ request, response }: HttpContext) {
    const restaurantId = getRestaurantId({ request } as any)
    const payload = request.only(['warehouseId', 'name', 'parentId', 'isActive'])

    // valida warehouse del restaurante
    await InventoryWarehouse.query()
      .where('restaurantId', restaurantId)
      .where('id', payload.warehouseId)
      .firstOrFail()

    if (payload.parentId) {
      await WarehouseLocation.query()
        .where('restaurantId', restaurantId)
        .where('id', payload.parentId)
        .firstOrFail()
    }

    const row = await WarehouseLocation.create({ ...payload, restaurantId })
    await row.load('warehouse')
    return response.created(row)
  }

  public async update({ params, request }: HttpContext) {
    const restaurantId = getRestaurantId({ request } as any)
    const row = await WarehouseLocation.query()
      .where('restaurantId', restaurantId)
      .where('id', params.id)
      .firstOrFail()

    const payload = request.only(['warehouseId', 'name', 'parentId', 'isActive'])

    if (payload.warehouseId) {
      await InventoryWarehouse.query()
        .where('restaurantId', restaurantId)
        .where('id', payload.warehouseId)
        .firstOrFail()
    }

    if (payload.parentId) {
      await WarehouseLocation.query()
        .where('restaurantId', restaurantId)
        .where('id', payload.parentId)
        .firstOrFail()
    }

    row.merge(payload)
    await row.save()
    await row.load('warehouse')
    return row
  }

  public async destroy({ params, request, response }: HttpContext) {
    const restaurantId = getRestaurantId({ request } as any)
    const row = await WarehouseLocation.query()
      .where('restaurantId', restaurantId)
      .where('id', params.id)
      .firstOrFail()
    await row.delete()
    return response.noContent()
  }
}
