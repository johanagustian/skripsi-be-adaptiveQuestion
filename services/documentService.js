const crypto = require('crypto');
const fs = require('fs');
const pdfParse = require('pdf-parse')
const pool = require('../db');

// Chunking ( Sliding Window + Sentence Boundary)
const chunkTextWithOverlap = (text, maxChars = 1200, overlap = 200) => {
    // Bersihkan spasi/enter berlebih bawaan ekstraksi PDF
    const cleanText = text.replace(/\s+/g, ' ').trim();
    const chunks = [];
    let startIndex = 0;

    while (startIndex < cleanText.length) {
        let endIndex = startIndex + maxChars;

        // Cari tanda titik terakhir agar kalimat tidak terpotong di tengah jalan
        if (endIndex < cleanText.length) {
            const lastPeriod = cleanText.lastIndexOf('. ', endIndex);
            
            // Pastikan titik tidak terlalu jauh ke belakang
            if (lastPeriod > startIndex + overlap) {
                endIndex = lastPeriod + 1; 
            }
        }

        const chunk = cleanText.substring(startIndex, endIndex).trim();
        
        // Simpan jika chunk cukup panjang dan bermakna (lebih dari 50 karakter)
        if (chunk.length > 50) { 
            chunks.push(chunk);
        }

        // Geser mundur sedikit untuk menciptakan overlap (menjaga konteks)
        startIndex = endIndex - overlap; 
    }

    return chunks;
};

const saveDocument = async (user_id, file_name, file_path) => {
    // Kita gunakan Transaction agar kalau terjadi error di tengah jalan, 
    // semua query di-rollback (dibatalkan) sehingga DB tetap bersih.
    const client = await pool.connect(); 

    try {
        await client.query('BEGIN'); 

        const document_id = `doc-${crypto.randomUUID()}`;
        const uploaded_at = new Date().toISOString();

        // 1. Simpan data dokumen fisik ke tabel documents
        await client.query(
            'INSERT INTO documents (document_id, user_id, file_name, file_path, uploaded_at) VALUES ($1, $2, $3, $4, $5)',
            [document_id, user_id, file_name, file_path, uploaded_at]
        );

        // 2. Baca isi teks mentah dari file PDF yang baru di-upload
        const dataBuffer = fs.readFileSync(file_path);
        const pdfData = await pdfParse(dataBuffer);
        const fullText = pdfData.text;

        // 3. Eksekusi Chunking 
        const validChunks = chunkTextWithOverlap(fullText, 1200, 200);

        if (validChunks.length === 0) {
            throw new Error('Tidak ada teks yang bisa diekstrak dari dokumen ini.');
        }

        // 4. Looping untuk menyimpan setiap potongan teks ke tabel document_chunks
        for (const textChunk of validChunks) {
            const chunk_id = `chunk-${crypto.randomUUID()}`;
            await client.query(
                'INSERT INTO document_chunks (chunk_id, document_id, context_text) VALUES ($1, $2, $3)',
                [chunk_id, document_id, textChunk]
            );
        }

        await client.query('COMMIT'); // Berhasil! Kunci permanen penyimpanan.
        
        return { 
            document_id, 
            total_chunks: validChunks.length 
        };

    } catch (error) {
        await client.query('ROLLBACK'); // Batalkan semua simpanan karena ada error
        throw error;
    } finally {
        client.release(); // Kembalikan koneksi ke pool agar tidak terjadi memory leak
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
    // 1. Cari path file fisik terlebih dahulu dan pastikan dokumen ini milik user yang sedang login
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

    // 3. Hapus file fisik PDF dari folder uploads/
    // Cek dulu apakah filenya benar-benar ada di hard disk sebelum dihapus
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }

    return { document_id };
};

// Jangan lupa tambahkan deleteDocument di exports
module.exports = { saveDocument, getDocumentsByUser, getDocumentById, deleteDocument };