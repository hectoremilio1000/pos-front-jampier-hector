import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('business_settings', (table) => {
      table.boolean('allow_temp_tables').notNullable().defaultTo(true)
    })
  }

  async down() {
    this.schema.alterTable('business_settings', (table) => {
      table.dropColumn('allow_temp_tables')
    })
  }
}
