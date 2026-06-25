const crypto = require('crypto');
const fs = require('fs');
const pdfParse = require('pdf-parse')
const pool = require('../db');

const TurndownService = require('turndown');

const turndownService = new TurndownService();

const convertToCleanMarkdown = (text) => {
    // Ubah ke format Markdown
    let md = turndownService.turndown(text);

    return md
        // Hapus Heading (Header/Judul Halaman/Footer yang jadi Heading)
        .replace(/^#+.*$/gm, '') 
        // Hapus baris metadata jurnal yang pendek atau mengandung keyword
        .split('\n')
        .filter(line => {
            const trimmed = line.trim();
            // Filter baris pendek (noise)
            if (trimmed.length < 40) return false;
            // Filter keyword sampah jurnal
            if (/^(page|volume|number|journal|sa jse|copyright|\d+)/i.test(trimmed)) return false;
            return true;
        })
        .join('\n\n')
        .replace(/\s+/g, ' ')
        .trim();
};

// Chunking ( Sliding Window + Sentence Boundary)
const chunkText = (text, chunkSize = 1200, overlap = 200) => {
    const chunks = [];
    const splitRecursively = (txt) => {
        if (txt.length <= chunkSize) {
            if (txt.length > 200) chunks.push(txt);
            return;
        }

        // Mencari titik potong di akhir kalimat (titik) atau paragraf
        const splitIdx = txt.lastIndexOf('. ', chunkSize) + 1 || txt.lastIndexOf('\n', chunkSize);
        const cut = splitIdx > 0 ? splitIdx : chunkSize;
        chunks.push(txt.substring(0, cut).trim());
        splitRecursively(txt.substring(cut - overlap).trim());
    };
    splitRecursively(text);
    return [...new Set(chunks)];
};

const saveDocument = async (user_id, file_name, file_path) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const document_id = `doc-${crypto.randomUUID()}`;
        const dataBuffer = fs.readFileSync(file_path);
        const pdfData = await pdfParse(dataBuffer);
        
        // Alur Bersih: Parse -> Clean Markdown -> Chunk -> Save
        const cleanedText = convertToCleanMarkdown(pdfData.text);
        const validChunks = chunkText(cleanedText);

        if (validChunks.length === 0) throw new Error('Gagal mengekstrak isi konten.');

        await client.query(
            'INSERT INTO documents (document_id, user_id, file_name, file_path) VALUES ($1, $2, $3, $4)',
            [document_id, user_id, file_name, file_path]
        );
        
        for (const chunk of validChunks) {
            await client.query(
                'INSERT INTO document_chunks (chunk_id, document_id, context_text) VALUES ($1, $2, $3)',
                [`chunk-${crypto.randomUUID()}`, document_id, chunk]
            );
        }

        await client.query('COMMIT');
        return { document_id, total_chunks: validChunks.length };
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
};

const getDocumentsByUser = async (user_id) => {
    const result = await pool.query(
        'SELECT document_id, file_name, uploaded_at FROM documents WHERE user_id = $1 ORDER BY uploaded_at DESC',
        [user_id]
    );
    return result.rows;
};

const getDocumentById = async (document_id, user_id) => {
    const result = await pool.query(
        'SELECT document_id, file_name, uploaded_at FROM documents WHERE document_id = $1 AND user_id = $2',
        [document_id, user_id]
    );

    if (result.rows.length === 0) {
        const err = new Error('Dokumen tidak ditemukan');
        err.statusCode = 404;
        throw err;
    }

    return result.rows[0];
};

const deleteDocument = async (document_id, user_id) => {
    
    const docResult = await pool.query(
        'SELECT file_path FROM documents WHERE document_id = $1 AND user_id = $2',
        [document_id, user_id]
    );

    if (docResult.rows.length === 0) {
        throw new Error('Dokumen tidak ditemukan atau Anda tidak memiliki akses untuk menghapusnya.');
    }

    const filePath = docResult.rows[0].file_path;

    // 2. Hapus data dokumen dari database
    // Catatan: Karena fitur CASCADE, tabel document_chunks yang terhubung akan otomatis ikut terhapus!
    await pool.query(
        'DELETE FROM documents WHERE document_id = $1 AND user_id = $2',
        [document_id, user_id]
    );

    // Hapus file fisik PDF dari folder uploads
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }

    return { document_id };
};

module.exports = { saveDocument, getDocumentsByUser, getDocumentById, deleteDocument };