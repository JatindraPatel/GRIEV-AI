// ─────────────────────────────────────────────────────
// GrievAI — Background Complaint Worker
// Reads from Redis queue: grievai:ai_queue
// Calls AI service and updates MongoDB
// Run: node src/workers/complaintWorker.js
// ─────────────────────────────────────────────────────
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const { connectDB }        = require('../config/db');
const { connectRedis, getRedisClient, isRedisAvailable } = require('../config/redis');
const Complaint            = require('../models/Complaint');
const { analyzeComplaint } = require('../utils/aiService');

const QUEUE_NAME    = 'grievai:ai_queue';
const POLL_INTERVAL = 2000;  // 2 seconds

async function processJob(job) {
  const { complaintDbId, text } = job;

  try {
    const ai = await analyzeComplaint(text);

    await Complaint.findByIdAndUpdate(complaintDbId, {
      $set: {
        language:        ai.language      || 'en',
        department:      ai.department    || null,
        departmentCode:  ai.department_code || null,
        priority:        ai.priority      || 'medium',
        priorityScore:   ai.priority_score || 0.5,
        aiProcessed:     true,
        aiRawResponse:   ai,
      },
    });

    console.log(`✅ [Worker] AI processed complaint ${complaintDbId} → ${ai.department} / ${ai.priority}`);
  } catch (err) {
    console.error(`❌ [Worker] Failed to process complaint ${complaintDbId}:`, err.message);
  }
}

// ── Demo Mode: generate fake complaints every 3s ──────
const DEMO_SUBJECTS = [
  'Bijli 5 din se nahi aayi – transformer kharab',
  'Pani pipeline leak ho rahi hai – colony mein flood',
  'Police FIR nahi le rahi – rishwat maang rahe hain',
  'Road mein bade potholes – accident ka darr',
  'Ration nahi mila 2 mahine se – dealer black market kar raha',
  'Hospital OPD band hai – doctor nahi aata',
  'Kachra 2 hafte se nahi utha – disease ka darr',
  'Internet tower 1 week se down – koi signal nahi',
];
const DEMO_NAMES  = ['Ramesh Kumar','Priya Sharma','Arun Patel','Sunita Devi','Mahesh Singh','Geeta Nair'];
const DEMO_STATES = ['Madhya Pradesh','Uttar Pradesh','Maharashtra','Gujarat','Bihar','Rajasthan'];

async function runDemoMode() {
  const { default: Complaint } = await import('./demoHelper.js').catch(() => null) || {};
  const ComplaintModel = require('../models/Complaint');

  console.log('🎭 DEMO MODE enabled — generating complaints every 3 seconds');

  setInterval(async () => {
    try {
      const subject = DEMO_SUBJECTS[Math.floor(Math.random() * DEMO_SUBJECTS.length)];
      const name    = DEMO_NAMES[Math.floor(Math.random() * DEMO_NAMES.length)];
      const state   = DEMO_STATES[Math.floor(Math.random() * DEMO_STATES.length)];
      const mobile  = '9' + Math.floor(100000000 + Math.random() * 900000000);

      const ai = await analyzeComplaint(subject);

      await ComplaintModel.create({
        citizenName:   name,
        citizenMobile: mobile,
        citizenState:  state,
        title:         subject,
        description:   subject + '. Kripya urgent action karein. Bahut pareshan hain.',
        language:      ai.language || 'hi',
        department:    ai.department,
        departmentCode:ai.department_code,
        priority:      ai.priority,
        priorityScore: ai.priority_score,
        aiProcessed:   true,
        aiRawResponse: ai,
        isDemo:        true,
        statusHistory: [{ status: 'pending', note: 'Demo complaint auto-generated' }],
      });

      console.log(`🎭 [Demo] Created: "${subject.substring(0, 50)}…" → ${ai.department}`);
    } catch (err) {
      console.error('🎭 [Demo] Error creating demo complaint:', err.message);
    }
  }, 3000);
}

async function main() {
  console.log('🚀 GrievAI Complaint Worker starting…');
  await connectDB();

  // Try Redis connection
  try {
    await connectRedis();
  } catch {
    console.warn('⚠️  Redis unavailable — worker will idle (no queue to drain)');
  }

  // Demo mode check
  if (process.env.DEMO_MODE === 'true') {
    await runDemoMode();
    return;   // demo mode takes over
  }

  console.log(`📡 Listening on queue: ${QUEUE_NAME}`);

  // Poll Redis queue continuously
  async function poll() {
    if (isRedisAvailable()) {
      try {
        const client = getRedisClient();
        // Block-pop: waits up to 2s for an item (efficient vs busy-loop)
        const result = await client.blpop(QUEUE_NAME, 2);
        if (result) {
          const [, raw] = result;
          const job = JSON.parse(raw);
          await processJob(job);
        }
      } catch (err) {
        console.error('[Worker] Queue error:', err.message);
        await new Promise((r) => setTimeout(r, POLL_INTERVAL));
      }
    } else {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL));
    }
    setImmediate(poll);   // non-blocking recursion
  }

  poll();
}

main().catch((err) => {
  console.error('❌ Worker fatal error:', err);
  process.exit(1);
});
