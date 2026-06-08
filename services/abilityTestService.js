const axios = require("axios");
const pool = require("../db");
const ABILITY_TEST_CONTEXT = require("../utils/abilityTestContext");

const AI_SERVICE_URL = "http://localhost:8000/generate";

const checkUserStatus = async (user_id) => {
  const existingSession = await pool.query(
    "SELECT session_id FROM ability_test_sessions WHERE user_id = $1 LIMIT 1",
    [user_id],
  );

  if (existingSession.rows.length > 0) {
    const error = new Error(
      "Akses ditolak. Anda sudah pernah mengambil Ability Test sebelumnya.",
    );

    error.statusCode = 403;
    throw error;
  }

  return 'New user'
};

const generateQuestionsForUser = async (user_id) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const session_id = `at-${crypto.randomUUID()}`;

    await client.query(
      "INSERT INTO ability_test_sessions (session_id, user_id) VALUES ($1, $2)",
      [session_id, user_id],
    );

    const difficulties = [
      "middle", "middle", "middle", "middle", "middle",
      "high", "high", "high", "high", "high",
    ];

    const generatedQuestions = [];

    const aiRequests = difficulties.map((diff) =>
      axios.post(AI_SERVICE_URL, {
        difficulty: diff,
        context: ABILITY_TEST_CONTEXT,
        mode_kreatif: true,
      }),
    );

    // Tunggu semua request selesai berbarengan
    const aiResponses = await Promise.all(aiRequests);

    // Baru kita simpan ke database dengan urutan yang sama
    for (let i = 0; i < aiResponses.length; i++) {
      const questionData = aiResponses[i].data;
      const diff = difficulties[i];
      const itemId = `itm-${crypto.randomUUID()}`;

      await client.query(
        `INSERT INTO ability_test_items (item_id, session_id, difficulty_level, question_text, options, correct_answer) 
         VALUES ($1, $2, $3, $4, $5, $6)`, 
        [
          itemId,
          session_id,
          diff,
          questionData.question_text,
          JSON.stringify(questionData.options),
          questionData.correct_answer,
        ]
      );

      generatedQuestions.push({
        item_id: itemId,
        difficulty: diff,
        question_text: questionData.question_text,
        options: questionData.options,
      });
    }

    await client.query("COMMIT");

    return {
      session_id,
      context: ABILITY_TEST_CONTEXT,
      questions: generatedQuestions,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Transaksi gagal, melakukan rollback:", error.message);
  } finally {
    client.release();
  }
};

const evaluateAndSaveTheta = async (user_id, session_id, answers) => {
  // 1. Tambahkan 'options' pada SELECT untuk mencocokkan A/B/C/D dengan teks jawaban
  const dbItems = await pool.query(
    "SELECT item_id, options, correct_answer FROM ability_test_items WHERE session_id = $1",
    [session_id],
  );

  if (dbItems.rows.length === 0) {
    throw new Error("Sesi ujian tidak valid atau tidak ditemukan.");
  }

  const total_soal = 10;
  let jumlah_benar = 0;

  // 2. Kamus konversi huruf ke indeks opsi
  const letterToIndex = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };

  answers.forEach((userAns) => {
    // Sesuaikan properti dengan schema Joi (menggunakan question_id)
    const dbAnswer = dbItems.rows.find((q) => q.item_id === userAns.question_id);
    
    if (dbAnswer) {
      // Ubah opsi JSON di DB menjadi Array (karena dari database PostgreSQL biasanya berbentuk String JSON)
      const optionsArray = typeof dbAnswer.options === 'string' ? JSON.parse(dbAnswer.options) : dbAnswer.options;
      
      // Konversi "A" -> 0, "B" -> 1, dst.
      const userIndex = letterToIndex[userAns.user_answer.toUpperCase()];
      const selectedText = optionsArray[userIndex];

      // Cek kebenaran jawaban berdasarkan teksnya
      if (
        selectedText &&
        selectedText.trim().toLowerCase() === dbAnswer.correct_answer.trim().toLowerCase()
      ) {
        jumlah_benar++;
      }
    }
  });

  // 3. Logika cold start - Kalkulasi Logit
  let p = jumlah_benar / total_soal;
  if (p === 0) p = 0.05;
  if (p === 1) p = 0.95;

  let theta_awal = Math.log(p / (1 - p));
  theta_awal = Math.round(theta_awal * 1000) / 1000;

  const ability_id = `ability-id-${crypto.randomUUID()}`;

  // 4. Simpan Theta dengan UPSERT (ON CONFLICT) yang benar (EXCLUDED.theta_score)
  await pool.query(
    `INSERT INTO user_abilities (ability_id, user_id, theta_score) VALUES ($1, $2, $3) 
     ON CONFLICT (user_id) 
     DO UPDATE SET 
        theta_score = EXCLUDED.theta_score,
        last_updated = CURRENT_TIMESTAMP`,
    [ability_id, user_id, parseFloat(theta_awal)]
  );

  return { jumlah_benar, total_soal, theta_awal };
};

module.exports = { generateQuestionsForUser, evaluateAndSaveTheta, checkUserStatus };
