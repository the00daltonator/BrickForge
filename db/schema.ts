import {integer,sqliteTable,text} from 'drizzle-orm/sqlite-core';
export const appSettings=sqliteTable('app_settings',{key:text('key').primaryKey(),value:text('value').notNull(),updatedAt:text('updated_at').notNull()});
export const usage=sqliteTable('usage_counters',{key:text('key').primaryKey(),count:integer('count').notNull().default(0)});
export const workspaces=sqliteTable('workspaces',{id:text('id').primaryKey(),data:text('data').notNull(),updatedAt:text('updated_at').notNull()});
