const now = () => new Date().toISOString();

const paths = [
  {
    id: 'path-everyday-clarity',
    slug: 'everyday-clarity',
    title: 'Everyday clarity',
    description: 'Speak with more ease in real situations.',
    domain: 'Everyday',
  },
  {
    id: 'path-work-with-words',
    slug: 'work-with-words',
    title: 'Work with words',
    description: 'Make ideas precise, useful, and clear.',
    domain: 'Work',
  },
  {
    id: 'path-ideas-in-depth',
    slug: 'ideas-in-depth',
    title: 'Ideas in depth',
    description: 'Read and discuss nuanced thinking.',
    domain: 'Ideas',
  },
];

// Original English-to-English starter content written for Lexora Editorial.
const words = [
  ['word-nuance', 'path-ideas-in-depth', 'nuance', '/ˈnuː.ɑːns/', 'noun', 'B2', 'Ideas', 'a very small difference in meaning, sound, or feeling', 'The editor noticed a nuance in tone that changed the whole paragraph.', ['a subtle nuance', 'capture a nuance', 'a nuance of meaning'], ['nuanced', 'nuances'], 'The two proposals look similar, but there is an important ____ in how they handle privacy.', ['nuance', 'routine', 'shortcut', 'boundary'], 'Look for a word that means a slight but meaningful difference.'],
  ['word-articulate', 'path-work-with-words', 'articulate', '/ɑːrˈtɪk.jə.lət/', 'verb', 'B2', 'Work', 'to express an idea or feeling clearly in words', 'Maya articulated her proposal with calm, precise language.', ['articulate an idea', 'clearly articulate', 'articulate a concern'], ['articulation', 'inarticulate'], 'Before the meeting, take a moment to ____ the outcome you want.', ['articulate', 'postpone', 'scatter', 'imitate'], 'The sentence needs a verb for expressing an idea clearly.'],
  ['word-resilient', 'path-everyday-clarity', 'resilient', '/rɪˈzɪl.jənt/', 'adjective', 'B2', 'Everyday', 'able to become strong, happy, or successful again after difficulty', 'A resilient learner returns to practice after a difficult week.', ['highly resilient', 'a resilient mindset', 'remain resilient'], ['resilience', 'resiliently'], 'After the failed presentation, he stayed ____ and prepared a better version.', ['resilient', 'fragile', 'random', 'silent'], 'Choose the adjective for recovering well after difficulty.'],
  ['word-clarify', 'path-everyday-clarity', 'clarify', '/ˈkler.ə.faɪ/', 'verb', 'B1', 'Everyday', 'to make something easier to understand by explaining it more clearly', 'Could you clarify what you mean by flexible working hours?', ['clarify a point', 'clarify expectations', 'clarify what you mean'], ['clarification', 'clarity', 'clear'], 'The manager asked the team to ____ the final deadline in writing.', ['clarify', 'complicate', 'ignore', 'borrow'], 'The team needs to make the deadline more understandable.'],
  ['word-perspective', 'path-ideas-in-depth', 'perspective', '/pərˈspek.tɪv/', 'noun', 'B2', 'Ideas', 'a particular way of thinking about or judging something', 'Reading fiction can give you a fresh perspective on a familiar problem.', ['a fresh perspective', 'broaden your perspective', 'from a perspective'], ['perspectives'], 'Talking to customers gave the design team a new ____ on the problem.', ['perspective', 'permission', 'routine', 'quantity'], 'The team gained a new way of seeing the problem.'],
  ['word-facilitate', 'path-work-with-words', 'facilitate', '/fəˈsɪl.ə.teɪt/', 'verb', 'C1', 'Work', 'to make an action or process easier to happen', 'Clear notes facilitate a more focused discussion.', ['facilitate a discussion', 'facilitate access', 'help facilitate'], ['facilitation', 'facilitator'], 'A shared agenda can ____ a more focused conversation.', ['facilitate', 'prevent', 'reduce', 'repeat'], 'The agenda makes the conversation easier to happen well.'],
  ['word-anticipate', 'path-everyday-clarity', 'anticipate', '/ænˈtɪs.ə.peɪt/', 'verb', 'B2', 'Everyday', 'to expect something and prepare for it before it happens', 'Try to anticipate the questions your audience may ask.', ['anticipate a need', 'anticipate a question', 'fully anticipate'], ['anticipation', 'anticipated'], 'Good hosts ____ their guests’ needs before anyone has to ask.', ['anticipate', 'forget', 'compare', 'announce'], 'The hosts predict needs early and prepare for them.'],
  ['word-infer', 'path-ideas-in-depth', 'infer', '/ɪnˈfɜːr/', 'verb', 'C1', 'Ideas', 'to form an opinion that something is probably true because of information you have', 'From the quiet room, we could infer that the meeting had already started.', ['infer from evidence', 'reasonably infer', 'infer that'], ['inference', 'inferential'], 'From the empty chairs, we can ____ that the event has ended.', ['infer', 'promise', 'build', 'admire'], 'Use the verb for drawing a likely conclusion from evidence.'],
  ['word-reliable', 'path-work-with-words', 'reliable', '/rɪˈlaɪ.ə.bəl/', 'adjective', 'B1', 'Work', 'able to be trusted to do what is expected or to give correct information', 'Choose a reliable source before you share a fact.', ['a reliable source', 'highly reliable', 'reliable information'], ['reliability', 'reliably'], 'The researcher used a ____ source instead of an unverified post.', ['reliable', 'temporary', 'narrow', 'careless'], 'The source can be trusted for accurate information.'],
  ['word-hesitate', 'path-everyday-clarity', 'hesitate', '/ˈhez.ə.teɪt/', 'verb', 'B1', 'Everyday', 'to pause before doing something because you are uncertain or nervous', 'Do not hesitate to ask for an example if a definition feels unclear.', ['hesitate to ask', 'without hesitation', 'briefly hesitate'], ['hesitation', 'hesitant'], 'If you need more context, do not ____ to ask for an example.', ['hesitate', 'pretend', 'combine', 'repeat'], 'The phrase means to pause because you feel unsure.'],
  ['word-initiative', 'path-work-with-words', 'initiative', '/ɪˈnɪʃ.ə.tɪv/', 'noun', 'B2', 'Work', 'the ability to decide and act on your own without waiting for someone to tell you', 'She showed initiative by improving the guide before the new team arrived.', ['show initiative', 'take the initiative', 'personal initiative'], ['initiate', 'initiatives'], 'He took the ____ and drafted the proposal before anyone requested it.', ['initiative', 'exception', 'boundary', 'shortcut'], 'He acted independently instead of waiting for instructions.'],
  ['word-align', 'path-work-with-words', 'align', '/əˈlaɪn/', 'verb', 'B2', 'Work', 'to be in agreement with a plan, purpose, or set of ideas', 'Make sure your examples align with the main point of your presentation.', ['align with a goal', 'closely align', 'align expectations'], ['alignment', 'aligned'], 'The new schedule should ____ with the team’s wider goals.', ['align', 'escape', 'hesitate', 'interrupt'], 'The schedule needs to match the wider goals.'],
];

export async function seedContent(database) {
  const timestamp = now();
  await database.query(
    `INSERT INTO tenants (id, slug, name, data_region, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(slug) DO NOTHING`,
    ['tenant-lexora-pilot', 'lexora-pilot', 'Lexora Enterprise Pilot', 'us', 'active', timestamp],
  );

  for (const path of paths) {
    await database.query(
      `INSERT INTO learning_paths (id, slug, title, description, domain, status, content_version, published_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'published', 1, ?, ?, ?)
       ON CONFLICT(slug) DO UPDATE SET
         title = excluded.title,
         description = excluded.description,
         domain = excluded.domain,
         status = 'published',
         updated_at = excluded.updated_at`,
      [path.id, path.slug, path.title, path.description, path.domain, timestamp, timestamp, timestamp],
    );
  }

  for (const word of words) {
    const [id, pathId, headword, phonetic, partOfSpeech, cefrLevel, domain, definition, example, collocations, family, reviewPrompt, reviewOptions, reviewHint] = word;
    await database.query(
      `INSERT INTO words
        (id, path_id, headword, phonetic, part_of_speech, cefr_level, domain, definition, example,
         collocations_json, family_json, review_prompt, review_options_json, review_hint, status,
         content_version, provenance, published_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', 1, 'Lexora Editorial', ?, ?, ?)
       ON CONFLICT(headword) DO UPDATE SET
         path_id = excluded.path_id,
         phonetic = excluded.phonetic,
         part_of_speech = excluded.part_of_speech,
         cefr_level = excluded.cefr_level,
         domain = excluded.domain,
         definition = excluded.definition,
         example = excluded.example,
         collocations_json = excluded.collocations_json,
         family_json = excluded.family_json,
         review_prompt = excluded.review_prompt,
         review_options_json = excluded.review_options_json,
         review_hint = excluded.review_hint,
         provenance = excluded.provenance,
         status = 'published',
         updated_at = excluded.updated_at`,
      [id, pathId, headword, phonetic, partOfSpeech, cefrLevel, domain, definition, example, JSON.stringify(collocations), JSON.stringify(family), reviewPrompt, JSON.stringify(reviewOptions), reviewHint, timestamp, timestamp, timestamp],
    );
  }
}
