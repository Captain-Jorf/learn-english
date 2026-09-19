import { createHash, randomUUID } from 'node:crypto';
import { hashPassword, verifyPassword } from './auth.mjs';
import { AppError } from './http.mjs';

const outcomeScores = { again: 0, hard: 3, good: 4, easy: 5 };

function timestamp() {
  return new Date().toISOString();
}

function plusDays(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function plusMinutes(minutes) {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

function parseJson(value, fallback) {
  try { return JSON.parse(value); } catch { return fallback; }
}

function publicUser(row) {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    ageBand: row.age_band,
    tenantId: row.tenant_id || null,
    createdAt: row.created_at,
  };
}

function publicWord(row) {
  return {
    id: row.id,
    headword: row.headword,
    phonetic: row.phonetic,
    partOfSpeech: row.part_of_speech,
    cefrLevel: row.cefr_level,
    domain: row.domain,
    definition: row.definition,
    example: row.example,
    collocations: parseJson(row.collocations_json, []),
    family: parseJson(row.family_json, []),
    review: {
      prompt: row.review_prompt,
      options: parseJson(row.review_options_json, []),
      hint: row.review_hint,
    },
    contentVersion: row.content_version,
    provenance: row.provenance,
  };
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function assertLearnerAgeBand(ageBand, config) {
  const normalized = String(ageBand || '').toLowerCase();
  if (normalized === 'under_13' && !config.ageGate.parentalConsentEnabled) {
    throw new AppError(403, 'AGE_RESTRICTED', `Lexora accounts require a user to be at least ${config.ageGate.minimumAge} until verified parental consent is enabled.`);
  }
  if (!['teen', 'adult', 'under_13'].includes(normalized)) {
    throw new AppError(400, 'INVALID_AGE_BAND', 'ageBand must be teen, adult, or under_13.');
  }
  return normalized;
}

function assertRole(user, roles) {
  if (!user || !roles.includes(user.role)) {
    throw new AppError(403, 'FORBIDDEN', 'This action requires a different Lexora role.');
  }
}

function scheduleNextReview(state, outcome) {
  const score = outcomeScores[outcome];
  if (score === undefined) throw new AppError(400, 'INVALID_OUTCOME', 'outcome must be again, hard, good, or easy.');

  const priorInterval = Number(state.interval_days);
  const priorEase = Number(state.ease_factor);
  let repetitions = Number(state.repetitions);
  let intervalDays;
  let ease = priorEase;
  let lapseCount = Number(state.lapse_count);
  let dueAt;

  if (outcome === 'again') {
    repetitions = 0;
    lapseCount += 1;
    ease = Math.max(1.3, priorEase - 0.2);
    intervalDays = 0;
    dueAt = plusMinutes(10);
  } else {
    repetitions += 1;
    ease = Math.max(1.3, priorEase + (0.1 - (5 - score) * (0.08 + (5 - score) * 0.02)));
    if (repetitions === 1) intervalDays = 1;
    else if (repetitions === 2) intervalDays = outcome === 'hard' ? 2 : outcome === 'easy' ? 5 : 3;
    else {
      const multiplier = outcome === 'hard' ? 0.85 : outcome === 'easy' ? 1.3 : 1;
      intervalDays = Math.max(1, Math.round(Math.max(priorInterval, 1) * ease * multiplier));
    }
    dueAt = plusDays(intervalDays);
  }

  return { repetitions, intervalDays, ease, lapseCount, dueAt, priorInterval, priorEase };
}

function contentSafetyCheck(text) {
  const value = String(text || '').toLowerCase();
  const disallowed = ['how to make a bomb', 'how to hurt someone', 'sexual content involving a child'];
  return disallowed.some((phrase) => value.includes(phrase))
    ? { allowed: false, category: 'unsafe_request' }
    : { allowed: true, category: 'clear' };
}

export function createServices({ database, config }) {
  async function getUser(userId) {
    const result = await database.query('SELECT * FROM users WHERE id = ? AND deleted_at IS NULL', [userId]);
    return result.rows[0] || null;
  }

  async function initializeLearningState(userId) {
    const catalogue = await database.query(`SELECT id FROM words WHERE status = 'published'`);
    const dueAt = timestamp();
    for (const word of catalogue.rows) {
      await database.query(
        `INSERT INTO review_states (user_id, word_id, due_at, interval_days, ease_factor, repetitions, lapse_count, updated_at)
         VALUES (?, ?, ?, 0, 2.5, 0, 0, ?)
         ON CONFLICT(user_id, word_id) DO NOTHING`,
        [userId, word.id, dueAt, dueAt],
      );
    }
  }

  async function registerUser(input) {
    const email = normalizeEmail(input.email);
    const password = String(input.password || '');
    const displayName = String(input.displayName || '').trim().slice(0, 80) || null;
    const ageBand = assertLearnerAgeBand(input.ageBand, config);
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new AppError(400, 'INVALID_EMAIL', 'A valid email address is required.');
    if (password.length < 12) throw new AppError(400, 'WEAK_PASSWORD', 'Password must contain at least 12 characters.');

    const existing = await database.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.rows[0]) throw new AppError(409, 'EMAIL_IN_USE', 'An account with this email already exists.');

    const id = randomUUID();
    const createdAt = timestamp();
    await database.query(
      `INSERT INTO users (id, email, display_name, password_hash, role, age_band, privacy_policy_version, terms_version, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'learner', ?, ?, ?, ?, ?)`,
      [id, email, displayName, hashPassword(password), ageBand, input.privacyPolicyVersion || null, input.termsVersion || null, createdAt, createdAt],
    );
    await initializeLearningState(id);
    return getUser(id);
  }

  async function login(input) {
    const email = normalizeEmail(input.email);
    const result = await database.query('SELECT * FROM users WHERE email = ? AND deleted_at IS NULL', [email]);
    const user = result.rows[0];
    if (!user || !verifyPassword(String(input.password || ''), user.password_hash)) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
    }
    if (user.account_status !== 'active') throw new AppError(403, 'ACCOUNT_UNAVAILABLE', 'This Lexora account is not active.');
    return user;
  }

  async function listProviders() {
    return Object.entries(config.social).map(([provider, settings]) => ({
      provider,
      configured: Boolean(settings.clientId && settings.redirectUri),
      flow: 'oauth_2_1_pkce',
    }));
  }

  async function getCatalog({ domain, limit = 30, offset = 0 } = {}) {
    const requestedLimit = Math.min(Math.max(Number(limit) || 30, 1), 100);
    const requestedOffset = Math.max(Number(offset) || 0, 0);
    const values = [];
    let where = `WHERE w.status = 'published'`;
    if (domain) {
      where += ' AND w.domain = ?';
      values.push(domain);
    }
    const count = await database.query(`SELECT COUNT(*) AS total FROM words w ${where}`, values);
    const rows = await database.query(
      `SELECT w.* FROM words w ${where} ORDER BY w.headword ASC LIMIT ? OFFSET ?`,
      [...values, requestedLimit, requestedOffset],
    );
    return { total: Number(count.rows[0]?.total || 0), words: rows.rows.map(publicWord) };
  }

  async function listPaths() {
    const rows = await database.query(`SELECT * FROM learning_paths WHERE status = 'published' ORDER BY title ASC`);
    return rows.rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      description: row.description,
      domain: row.domain,
      contentVersion: row.content_version,
    }));
  }

  async function getDashboard(userId) {
    const user = await getUser(userId);
    if (!user) throw new AppError(401, 'UNAUTHENTICATED', 'A valid user session is required.');
    const due = await database.query('SELECT COUNT(*) AS total FROM review_states WHERE user_id = ? AND due_at <= ?', [userId, timestamp()]);
    const mastered = await database.query('SELECT COUNT(*) AS total FROM review_states WHERE user_id = ? AND repetitions >= 3', [userId]);
    const sessions = await database.query('SELECT COALESCE(SUM(focused_minutes), 0) AS total FROM learning_sessions WHERE user_id = ? AND started_at >= ?', [userId, plusDays(-7)]);
    const entitlements = await database.query(`SELECT plan_key, source, ends_at FROM entitlements WHERE user_id = ? AND status = 'active' AND (ends_at IS NULL OR ends_at > ?)`, [userId, timestamp()]);

    return {
      user: publicUser(user),
      dueReviews: Number(due.rows[0]?.total || 0),
      masteredWords: Number(mastered.rows[0]?.total || 0),
      focusedMinutesLast7Days: Number(sessions.rows[0]?.total || 0),
      entitlements: entitlements.rows.map((item) => ({ planKey: item.plan_key, source: item.source, endsAt: item.ends_at })),
    };
  }

  async function getNextReview(userId) {
    const row = await database.query(
      `SELECT w.*, rs.due_at, rs.interval_days, rs.ease_factor, rs.repetitions, rs.lapse_count
       FROM review_states rs
       JOIN words w ON w.id = rs.word_id
       WHERE rs.user_id = ? AND w.status = 'published'
       ORDER BY CASE WHEN rs.due_at <= ? THEN 0 ELSE 1 END, rs.due_at ASC
       LIMIT 1`,
      [userId, timestamp()],
    );
    if (!row.rows[0]) return null;
    const word = publicWord(row.rows[0]);
    return {
      ...word,
      schedule: {
        dueAt: row.rows[0].due_at,
        intervalDays: Number(row.rows[0].interval_days),
        easeFactor: Number(row.rows[0].ease_factor),
        repetitions: Number(row.rows[0].repetitions),
      },
    };
  }

  async function gradeReview(userId, wordId, outcome) {
    return database.transaction(async (transaction) => {
      const stateResult = await transaction.query('SELECT * FROM review_states WHERE user_id = ? AND word_id = ?', [userId, wordId]);
      const state = stateResult.rows[0];
      if (!state) throw new AppError(404, 'REVIEW_NOT_FOUND', 'No review state exists for this word.');
      const schedule = scheduleNextReview(state, outcome);
      const updatedAt = timestamp();
      await transaction.query(
        `UPDATE review_states
         SET due_at = ?, interval_days = ?, ease_factor = ?, repetitions = ?, lapse_count = ?, last_outcome = ?, updated_at = ?
         WHERE user_id = ? AND word_id = ?`,
        [schedule.dueAt, schedule.intervalDays, schedule.ease, schedule.repetitions, schedule.lapseCount, outcome, updatedAt, userId, wordId],
      );
      await transaction.query(
        `INSERT INTO review_events
         (id, user_id, word_id, outcome, prior_interval_days, next_interval_days, prior_ease_factor, next_ease_factor, occurred_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [randomUUID(), userId, wordId, outcome, schedule.priorInterval, schedule.intervalDays, schedule.priorEase, schedule.ease, updatedAt],
      );
      return {
        wordId,
        outcome,
        nextReviewAt: schedule.dueAt,
        intervalDays: schedule.intervalDays,
        easeFactor: Number(schedule.ease.toFixed(2)),
        repetitions: schedule.repetitions,
      };
    });
  }

  async function redeemAccessCode(userId, rawCode) {
    const codeHash = createHash('sha256').update(String(rawCode || '').trim().toUpperCase()).digest('hex');
    return database.transaction(async (transaction) => {
      const currentTime = timestamp();
      const result = await transaction.query(
        `SELECT * FROM access_codes
         WHERE code_hash = ? AND status = 'active'
         AND (starts_at IS NULL OR starts_at <= ?)
         AND (expires_at IS NULL OR expires_at > ?)`,
        [codeHash, currentTime, currentTime],
      );
      const accessCode = result.rows[0];
      if (!accessCode || Number(accessCode.redemption_count) >= Number(accessCode.max_redemptions)) {
        throw new AppError(404, 'ACCESS_CODE_INVALID', 'This access code is invalid, expired, or fully redeemed.');
      }

      const existing = await transaction.query('SELECT id FROM access_code_redemptions WHERE access_code_id = ? AND user_id = ?', [accessCode.id, userId]);
      if (existing.rows[0]) throw new AppError(409, 'ACCESS_CODE_ALREADY_REDEEMED', 'This code has already been redeemed by this account.');

      const redemption = await transaction.query(
        'UPDATE access_codes SET redemption_count = redemption_count + 1 WHERE id = ? AND redemption_count < max_redemptions',
        [accessCode.id],
      );
      if (redemption.rowCount !== 1) throw new AppError(409, 'ACCESS_CODE_FULL', 'This access code has just reached its redemption limit.');

      await transaction.query('INSERT INTO access_code_redemptions (id, access_code_id, user_id, redeemed_at) VALUES (?, ?, ?, ?)', [randomUUID(), accessCode.id, userId, currentTime]);
      await transaction.query(
        `INSERT INTO entitlements (id, user_id, tenant_id, source, plan_key, status, starts_at, metadata_json, created_at, updated_at)
         VALUES (?, ?, ?, 'access_code', ?, 'active', ?, '{}', ?, ?)`,
        [randomUUID(), userId, accessCode.tenant_id, accessCode.plan_key, currentTime, currentTime, currentTime],
      );
      return { planKey: accessCode.plan_key, status: 'active', source: 'access_code' };
    });
  }

  async function listConversations(userId) {
    const rows = await database.query(
      `SELECT id, title, status, created_at, updated_at, retention_until
       FROM coach_conversations WHERE user_id = ? AND status = 'active' ORDER BY updated_at DESC LIMIT 50`,
      [userId],
    );
    return rows.rows.map((row) => ({ id: row.id, title: row.title, status: row.status, createdAt: row.created_at, updatedAt: row.updated_at, retentionUntil: row.retention_until }));
  }

  async function sendCoachMessage(userId, input) {
    const text = String(input.message || '').trim();
    if (!text || text.length > 4_000) throw new AppError(400, 'INVALID_MESSAGE', 'Coach messages must contain between 1 and 4,000 characters.');
    const safety = contentSafetyCheck(text);
    let conversationId = input.conversationId;
    let conversation;

    if (conversationId) {
      const result = await database.query('SELECT * FROM coach_conversations WHERE id = ? AND user_id = ?', [conversationId, userId]);
      conversation = result.rows[0];
      if (!conversation) throw new AppError(404, 'CONVERSATION_NOT_FOUND', 'The requested coach conversation was not found.');
    } else {
      conversationId = randomUUID();
      const createdAt = timestamp();
      const retentionUntil = plusDays(config.retentionDays);
      await database.query(
        `INSERT INTO coach_conversations (id, user_id, title, status, created_at, updated_at, retention_until)
         VALUES (?, ?, ?, 'active', ?, ?, ?)`,
        [conversationId, userId, text.slice(0, 72), createdAt, createdAt, retentionUntil],
      );
    }

    const messageId = randomUUID();
    const createdAt = timestamp();
    await database.query(
      `INSERT INTO coach_messages (id, conversation_id, role, content, safety_status, created_at)
       VALUES (?, ?, 'user', ?, ?, ?)`,
      [messageId, conversationId, text, safety.category, createdAt],
    );

    if (!safety.allowed) {
      throw new AppError(422, 'SAFETY_BLOCKED', 'This request cannot be sent to the tutor.');
    }
    if (!config.aiGateway.url || !config.aiGateway.token) {
      throw new AppError(503, 'AI_GATEWAY_NOT_CONFIGURED', 'The secure AI gateway is not configured for this environment.');
    }

    const history = await database.query(
      `SELECT role, content FROM coach_messages WHERE conversation_id = ? ORDER BY created_at ASC LIMIT 30`,
      [conversationId],
    );
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.aiGateway.timeoutMs);
    let response;
    try {
      response = await fetch(config.aiGateway.url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${config.aiGateway.token}`,
          'x-lexora-model': config.aiGateway.model || 'default',
        },
        body: JSON.stringify({
          purpose: 'english_to_english_tutor',
          userId,
          conversationId,
          messages: history.rows.map((item) => ({ role: item.role, content: item.content })),
          guardrails: { ageBand: '13_plus', style: 'socratic', writingFeedback: true },
        }),
        signal: controller.signal,
      });
    } catch {
      throw new AppError(503, 'AI_GATEWAY_UNAVAILABLE', 'The secure AI gateway is unavailable.');
    } finally {
      clearTimeout(timeout);
    }
    if (!response.ok) throw new AppError(502, 'AI_GATEWAY_ERROR', 'The secure AI gateway rejected the request.');
    const payload = await response.json();
    const reply = String(payload.reply || '').trim();
    if (!reply) throw new AppError(502, 'AI_GATEWAY_INVALID_RESPONSE', 'The AI gateway returned no tutor reply.');

    const replyId = randomUUID();
    const repliedAt = timestamp();
    await database.query(
      `INSERT INTO coach_messages (id, conversation_id, role, content, safety_status, provider, created_at)
       VALUES (?, ?, 'assistant', ?, 'clear', ?, ?)`,
      [replyId, conversationId, reply, payload.provider || 'gateway', repliedAt],
    );
    await database.query('UPDATE coach_conversations SET updated_at = ? WHERE id = ?', [repliedAt, conversationId]);
    return { conversationId, userMessage: { id: messageId, content: text, createdAt }, assistantMessage: { id: replyId, content: reply, createdAt: repliedAt } };
  }

  async function exportUserData(userId) {
    const user = await getUser(userId);
    if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User not found.');
    const [reviews, events, conversations, messages, entitlements] = await Promise.all([
      database.query('SELECT * FROM review_states WHERE user_id = ?', [userId]),
      database.query('SELECT * FROM review_events WHERE user_id = ? ORDER BY occurred_at DESC', [userId]),
      database.query('SELECT * FROM coach_conversations WHERE user_id = ?', [userId]),
      database.query(`SELECT cm.* FROM coach_messages cm JOIN coach_conversations cc ON cc.id = cm.conversation_id WHERE cc.user_id = ? ORDER BY cm.created_at ASC`, [userId]),
      database.query('SELECT * FROM entitlements WHERE user_id = ?', [userId]),
    ]);
    return { exportedAt: timestamp(), user: publicUser(user), reviewStates: reviews.rows, reviewEvents: events.rows, coachConversations: conversations.rows, coachMessages: messages.rows, entitlements: entitlements.rows };
  }

  async function requestDataDeletion(userId) {
    const existing = await database.query(`SELECT id FROM data_deletion_requests WHERE user_id = ? AND status = 'pending'`, [userId]);
    if (existing.rows[0]) return { requestId: existing.rows[0].id, status: 'pending' };
    const id = randomUUID();
    await database.query('INSERT INTO data_deletion_requests (id, user_id, status, requested_at) VALUES (?, ?, ?, ?)', [id, userId, 'pending', timestamp()]);
    return { requestId: id, status: 'pending' };
  }

  async function createWord(actor, input, requestId) {
    assertRole(actor, ['editor', 'admin']);
    const required = ['headword', 'partOfSpeech', 'cefrLevel', 'domain', 'definition', 'example', 'reviewPrompt', 'reviewHint'];
    for (const field of required) if (!String(input[field] || '').trim()) throw new AppError(400, 'INVALID_CONTENT', `${field} is required.`);
    const id = randomUUID();
    const createdAt = timestamp();
    const path = await database.query('SELECT id FROM learning_paths WHERE id = ? OR slug = ?', [input.pathId || '', input.pathSlug || '']);
    if (!path.rows[0]) throw new AppError(400, 'PATH_NOT_FOUND', 'A valid learning path is required.');
    await database.query(
      `INSERT INTO words
       (id, path_id, headword, phonetic, part_of_speech, cefr_level, domain, definition, example,
        collocations_json, family_json, review_prompt, review_options_json, review_hint, status,
        content_version, provenance, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', 1, ?, ?, ?, ?)`,
      [id, path.rows[0].id, String(input.headword).toLowerCase(), input.phonetic || null, input.partOfSpeech, input.cefrLevel, input.domain, input.definition, input.example, JSON.stringify(input.collocations || []), JSON.stringify(input.family || []), input.reviewPrompt, JSON.stringify(input.reviewOptions || []), input.reviewHint, input.provenance || 'Lexora Editorial', actor.id, createdAt, createdAt],
    );
    await database.query('INSERT INTO content_reviews (id, content_type, content_id, submitted_by, status, created_at) VALUES (?, ?, ?, ?, ?, ?)', [randomUUID(), 'word', id, actor.id, 'pending', createdAt]);
    await database.query('INSERT INTO audit_events (id, tenant_id, actor_user_id, action, target_type, target_id, request_id, occurred_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [randomUUID(), actor.tenant_id || null, actor.id, 'content.word.create', 'word', id, requestId, createdAt]);
    return { id, status: 'draft' };
  }

  async function publishWord(actor, wordId, requestId) {
    assertRole(actor, ['reviewer', 'admin']);
    const existing = await database.query('SELECT * FROM words WHERE id = ?', [wordId]);
    if (!existing.rows[0]) throw new AppError(404, 'WORD_NOT_FOUND', 'Word not found.');
    const publishedAt = timestamp();
    await database.query(
      `UPDATE words SET status = 'published', reviewed_by = ?, published_at = ?, content_version = content_version + 1, updated_at = ? WHERE id = ?`,
      [actor.id, publishedAt, publishedAt, wordId],
    );
    await database.query(`UPDATE content_reviews SET status = 'approved', reviewed_by = ?, resolved_at = ? WHERE content_type = 'word' AND content_id = ? AND status = 'pending'`, [actor.id, publishedAt, wordId]);
    await database.query('INSERT INTO audit_events (id, tenant_id, actor_user_id, action, target_type, target_id, request_id, occurred_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [randomUUID(), actor.tenant_id || null, actor.id, 'content.word.publish', 'word', wordId, requestId, publishedAt]);
    return { id: wordId, status: 'published', publishedAt };
  }

  async function bootstrapAdmin() {
    if (!config.bootstrapAdmin.email || !config.bootstrapAdmin.password) return;
    const email = normalizeEmail(config.bootstrapAdmin.email);
    const existing = await database.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.rows[0]) return;
    const createdAt = timestamp();
    await database.query(
      `INSERT INTO users (id, tenant_id, email, display_name, password_hash, role, age_band, account_status, created_at, updated_at)
       VALUES (?, ?, ?, 'Lexora administrator', ?, 'admin', 'adult', 'active', ?, ?)`,
      [randomUUID(), 'tenant-lexora-pilot', email, hashPassword(config.bootstrapAdmin.password), createdAt, createdAt],
    );
  }

  return {
    getUser,
    publicUser,
    registerUser,
    login,
    listProviders,
    getCatalog,
    listPaths,
    getDashboard,
    getNextReview,
    gradeReview,
    redeemAccessCode,
    listConversations,
    sendCoachMessage,
    exportUserData,
    requestDataDeletion,
    createWord,
    publishWord,
    bootstrapAdmin,
  };
}
