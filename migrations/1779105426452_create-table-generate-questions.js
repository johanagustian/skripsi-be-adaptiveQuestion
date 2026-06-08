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
    pgm.createTable('generate_questions', {
        question_id: {
            type: 'VARCHAR(50)',
            primaryKey: true
        },
        chunk_id: {
            type: 'VARCHAR(50)',
            notNull: true,                      
            references: 'document_chunks(chunk_id)',
            onDelete: 'CASCADE'                 
        },
        question_text: {
            type: 'TEXT',
            notNull: true
        },
        options: {
            type: 'JSONB',
            notNull: true
        },
        correct_answer: {
            type: 'TEXT',
            notNull: true
        },
        difficulty_level: {
            type: 'TEXT',
            notNull: true
        },
        b_parameter: {
            type: 'FLOAT',
            notNull: true
        }   
    })
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
    pgm.dropTable('generate_questions')
};
