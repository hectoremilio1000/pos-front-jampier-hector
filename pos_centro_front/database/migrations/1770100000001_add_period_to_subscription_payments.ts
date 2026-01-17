import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'subscription_payments'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.date('period_start').nullable()
      table.date('period_end').nullable()
      table.index(['subscription_id', 'period_start', 'period_end'])
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropIndex(['subscription_id', 'period_start', 'period_end'])
      table.dropColumn('period_start')
      table.dropColumn('period_end')
    })
  }
}
