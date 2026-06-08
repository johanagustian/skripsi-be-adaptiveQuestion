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
    pgm.createTable('document_chunks', {
        chunk_id: { 
            type: 'VARCHAR(50)', 
            primaryKey: true 
        },
        document_id: { 
            type: 'VARCHAR(50)', 
            notNull: true, 
            references: 'documents(document_id)', 
            onDelete: 'CASCADE'
        },
        context_text: { 
            type: 'TEXT', 
            notNull: true 
        }
    });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
    pgm.dropTable('document_chunks')
};
