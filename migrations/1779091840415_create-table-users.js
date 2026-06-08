/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
    pgm.createTable('users',{
        user_id: {
            type: 'VARCHAR(50)',
            primaryKey: true
        },
        email: {
            type: 'VARCHAR(100)',
            notNull: true,
            unique: true
        },
        password: {
            type: 'TEXT',
            notNull: true
        },
        full_name: {
            type: 'TEXT',
            notNull: true,
        },
        created_at: {
            type: 'TIMESTAMP',
            notNull: true,
            default: pgm.func('current_timestamp')
        }
    })
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
    pgm.dropTable('users');
};
