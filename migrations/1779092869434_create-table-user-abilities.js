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
    pgm.createTable('user_abilities', {
        ability_id: {
            type: 'VARCHAR(50)',
            primaryKey: true
        },
        user_id: {
            type: 'VARCHAR(50)',
            foreignkey: true,
            unique: true,
            references: 'users(user_id)',
            onDelete: 'CASCADE'
        },
        theta_score: {
            type: 'FLOAT',
            notNull: true
        },
        last_updated: {
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
    pgm.dropTable('user_abilities');
};
