const axios = require("axios");
const crypto = require("crypto");
const pool = require("../db");

// Lihat semua sesion (riwayat sesi)
const getAllSessions = async (user_id) => {
  await pool.query(
    `
      DELETE FROM sessions 
      WHERE user_id = $1 AND session_id NOT IN (
        SELECT DISTINCT session_id FROM learning_history
      )
    `,
    [user_id],
  );
  
  //sesi, nama dokumen, skor benar, total soal, dan perubahan Theta
  const query = `
        SELECT 
            s.session_id, 
            s.created_at,
            d.file_name,
            COUNT(lh.question_id) AS total_soal,
            SUM(CASE WHEN lh.is_correct = true THEN 1 ELSE 0 END) AS jumlah_benar,
            (
                SELECT theta_after 
                FROM learning_history 
                WHERE session_id = s.session_id 
                ORDER BY created_at DESC 
                LIMIT 1
            ) - (
                SELECT theta_before 
                FROM learning_history 
                WHERE session_id = s.session_id 
                ORDER BY created_at ASC 
                LIMIT 1
            ) AS theta_increase
        FROM sessions s
        LEFT JOIN documents d ON s.document_id = d.document_id
        LEFT JOIN learning_history lh ON s.session_id = lh.session_id
        WHERE s.user_id = $1
        GROUP BY s.session_id, s.created_at, d.file_name
        ORDER BY s.created_at DESC
    `;

  const result = await pool.query(query, [user_id]);

  if (result.rows.length === 0) {
    return { message: "Belum ada riwayat ujian." };
  }

  const formattedData = result.rows.map((row) => {
    let delta = row.theta_increase ? parseFloat(row.theta_increase) : 0;

    delta = Math.round(delta * 1000) / 1000;

    const formattedDelta = delta > 0 ? `+${delta}` : `${delta}`;

    return {
      session_id: row.session_id,
      document_name: row.file_name || "Latihan Mandiri",
      created_at: row.created_at,
      score: parseInt(row.jumlah_benar) || 0,
      total_soal: parseInt(row.total_soal) || 0,
      theta_increase: formattedDelta,
    };
  });

  return formattedData;
};

// Mulai Sesi Baru
const startSession = async (user_id, document_id) => {
  const session_id = `session-${crypto.randomUUID()}`;

  await pool.query(
    "INSERT INTO sessions (session_id, user_id, document_id) VALUES ($1, $2, $3)",
    [session_id, user_id, document_id],
  );

  const abilityCheck = await pool.query(
    "SELECT theta_score FROM user_abilities WHERE user_id = $1",
    [user_id],
  );

  if (abilityCheck.rows.length === 0) {
    const ability_id = `ability-${crypto.randomUUID()}`;

    await pool.query(
      "INSERT INTO user_abilities (ability_id, user_id, theta_score) VALUES ($1, $2, $3)",
      [ability_id, user_id, 0.0],
    );
  }

  return { session_id };
};

const getNextQuestion = async (session_id, user_id, document_id) => {

  // cek kemampuan awal
  const abilityQuery = await pool.query(
    "SELECT theta_score FROM user_abilities WHERE user_id = $1",
    [user_id],
  );
  const current_theta = abilityQuery.rows[0].theta_score;

  let difficulty_str = "middle";
  let expected_b_parameter = -0.5;

  if (current_theta >= 0) {
    difficulty_str = "high";
    expected_b_parameter = 0.5;
  }

  // Ambil satu chunk acak dari dokumen yang dipilih
  const chunkQuery = `
        SELECT chunk_id, context_text 
        FROM document_chunks 
        WHERE document_id = $1 
        ORDER BY RANDOM() LIMIT 1
    `;
  const chunkResult = await pool.query(chunkQuery, [document_id]);

  if (chunkResult.rows.length === 0) {
    throw new Error(
      "Dokumen belum dipotong (chunking) atau tidak memiliki teks.",
    );
  }

  const rowData = chunkResult.rows[0];
  const selectedChunkText = rowData.context_text?.toLowerCase() || "";

  // Tembak API Model AI 
  try {

    const pythonApiUrl = "http://localhost:8000/generate";

    const aiResponse = await axios.post(pythonApiUrl, {
      difficulty: difficulty_str,
      context: selectedChunkText,
    });

    const generatedData = aiResponse.data;    
    const question_id = `qst-${crypto.randomUUID()}`;
    const optionsJson = JSON.stringify(generatedData.options);

    // Simpan soal baru ke database (Perhatikan kita pakai chunk_id sekarang)
    await pool.query(
      `INSERT INTO generate_questions (question_id, chunk_id, question_text, options, correct_answer, difficulty_level, b_parameter) 
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        question_id,
        rowData.chunk_id,
        generatedData.question_text,
        optionsJson,
        generatedData.correct_answer,
        difficulty_str,
        expected_b_parameter,
      ],
    );

    return {
      question_id: question_id,
      reading_context: rowData.context_text,
      question_text: generatedData.question_text,
      options: generatedData.options,
      difficulty_level: difficulty_str,
      b_parameter: expected_b_parameter,
      current_theta: current_theta,
    };
  } catch (error) {
    throw new Error(
      "Gagal membangkitkan soal dari AI Service: " +
        (error.response?.data?.detail || error.message),
    );
  }
};

// Real-time update jawaban user dan perhitungan Theta
const submitAnswer = async (session_id, user_id, question_id, user_answer) => {
  
  // Mengambil jawaban dan jawaban benar dari database untuk soal yang diberikan
  const qResult = await pool.query(
    `SELECT 
            options, 
            correct_answer, 
            b_parameter 
        FROM generate_questions 
        WHERE question_id = $1`,
    [question_id],
  );

  if (qResult.rows.length === 0) {
    throw new Error("Soal tidak ditemukan.");
  }
  const question = qResult.rows[0];

  // B. LOGIKA PENCOCOKAN JAWABAN (A/B/C/D -> Teks Pilihan -> Kunci Jawaban)
  // 1. Konversi huruf ke indeks (0, 1, 2, 3)
  const letterToIndex = { A: 0, B: 1, C: 2, D: 3 };
  const userIndex = letterToIndex[user_answer];

  // 2. Ambil teks asli berdasarkan indeks yang dipilih user
  // (Asumsi question.options adalah array JSON di database)
  const selectedText = question.options[userIndex];

  // 3. Bandingkan teks pilihan user dengan teks kunci jawaban
  const is_correct =
    selectedText.trim().toLowerCase() ===
    question.correct_answer.trim().toLowerCase();
  const S = is_correct ? 1 : 0;

  // C. Ambil Theta (Kemampuan) user saat ini
  const abilityResult = await pool.query(
    "SELECT theta_score FROM user_abilities WHERE user_id = $1",
    [user_id],
  );
  let current_theta = abilityResult.rows[0]?.theta_score || 0.0;

  const probability_irt = await probabiltyIRT(current_theta, question.b_parameter);
  const new_theta = await updateTheta(current_theta, S, probability_irt);

  // F. Simpan riwayat jawaban ke database
  const history_id = `hist-${crypto.randomUUID()}`;

  await pool.query(
    `INSERT INTO learning_history 
        (history_id, session_id, user_id, question_id, user_answer, is_correct, theta_before, theta_after) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    // Perhatikan: user_answer yang disimpan di DB tetap huruf 'A'/'B'/'C'/'D' untuk mempermudah analisis nanti
    [
      history_id,
      session_id,
      user_id,
      question_id,
      user_answer,
      is_correct,
      current_theta,
      new_theta,
    ],
  );

  await pool.query(
    "UPDATE user_abilities SET theta_score = $1 WHERE user_id = $2",
    [new_theta, user_id],
  );

  return {
    is_correct: is_correct,
    correct_answer: question.correct_answer,
    old_theta: current_theta,
    new_theta: new_theta,
    explanation: is_correct
      ? "Tepat sekali!"
      : "Jawaban kurang tepat. Coba perhatikan lagi konteks bacaannya.",
  };
};

const probabiltyIRT = async (theta, b_parameter) => {
  return 1 / (1 + Math.exp(-(theta - b_parameter)));
};

const updateTheta = async (current_theta, S, probability_irt, learning_rate = 0.15) => {
  return current_theta + learning_rate * (S - probability_irt);
}

const getSessionSummary = async (session_id) => {

  const sessionCheck = await pool.query(
    `SELECT s.session_id, d.file_name 
        FROM sessions s
        JOIN documents d ON d.document_id = s.document_id
        WHERE session_id = $1`,
    [session_id],
  );

  const sessionData = sessionCheck.rows[0];

  if (!sessionData) {
    const error = new Error("Sesi tidak ditemukan atau tidak valid");
    error.statusCode = 404;
    throw error;
  }

  const fileName = sessionData.file_name;

  // Mengambil seluruh riwayat jawaban serta data tingkat kesulitan soalnya
  const query = `
        SELECT 
            lh.is_correct, 
            lh.theta_before, 
            lh.theta_after,
            gq.difficulty_level,
            gq.b_parameter
        FROM learning_history lh
        JOIN generate_questions gq ON lh.question_id = gq.question_id
        WHERE lh.session_id = $1 
        ORDER BY lh.created_at ASC
    `;
  const result = await pool.query(query, [session_id]);
  const answers = result.rows;
  const total_questions_answered = answers.length;

  if (total_questions_answered === 0) {
    return { message: "Belum ada soal yang dijawab pada sesi ini." };
  }

  // Hitung statistik dasar (Benar/Salah)
  const total_correct = answers.filter((a) => a.is_correct === true).length;
  const total_wrong = total_questions_answered - total_correct;

  // 3. Kalkulasi pergerakan Theta (Awal vs Akhir)
  const initial_theta = answers[0].theta_before;
  const final_theta = answers[answers.length - 1].theta_after;

  // Menghitung selisih (delta) dan membulatkannya ke 3 angka di belakang koma
  let theta_delta = final_theta - initial_theta;
  theta_delta = Math.round(theta_delta * 1000) / 1000;

  // 4. Format data array (Time-series) khusus untuk grafik (Chart) di frontend
  const chart_data = answers.map((ans, index) => ({
    step: index + 1,
    theta_score: ans.theta_after,
    difficulty: ans.difficulty_level,
    b_parameter: ans.b_parameter,
    is_correct: ans.is_correct,
  }));

  return {
    session_id,
    fileName,
    summary: {
      total_questions: total_questions_answered,
      total_correct,
      total_wrong,
      initial_theta: Math.round(initial_theta * 1000) / 1000,
      final_theta: Math.round(final_theta * 1000) / 1000,
      theta_delta: theta_delta > 0 ? `+${theta_delta}` : `${theta_delta}`, // Output: "+0.45" atau "-0.12"
    },
    history_chart: chart_data,
  };
};


const terminateSession = async (session_id) => {
  // Opsional: Kunci sesi jika tabel sessions memiliki kolom status
  // await pool.query("UPDATE sessions SET status = 'completed' WHERE session_id = $1", [session_id]);
  return true;
};

const getSessionReview = async (session_id, user_id) => {
  const sessionCheck = await pool.query(
    `SELECT session_id FROM sessions WHERE session_id = $1`,
    [session_id],
  );

  if (sessionCheck.rows.length === 0) {
    const error = new Error("Sesi tidak ditemukan atau tidak valid");
    error.statusCode = 404;
    throw error;
  }

  const query = `
        SELECT 
            d.file_name,
            gq.question_text,
            gq.options,
            lh.user_answer,
            gq.correct_answer,
            lh.is_correct,
            gq.difficulty_level,
            dc.context_text AS reading_context
        FROM learning_history lh
        JOIN generate_questions gq ON lh.question_id = gq.question_id
        JOIN document_chunks dc ON gq.chunk_id = dc.chunk_id
        JOIN sessions s ON s.session_id = lh.session_id
        JOIN documents d ON d.document_id = s.document_id
        WHERE lh.session_id = $1 AND lh.user_id = $2
        ORDER BY lh.created_at ASC
    `;
  const result = await pool.query(query, [session_id, user_id]);

  if (result.rows.length === 0) {
    return { message: "Data review tidak ditemukan untuk sesi ini." };
  }

  return result.rows;
};

module.exports = {
  startSession,
  getNextQuestion,
  getAllSessions,
  getSessionSummary,
  submitAnswer,
  getSessionReview,
  terminateSession,
};
