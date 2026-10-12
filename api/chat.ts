import type { IncomingMessage, ServerResponse } from 'http';
import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY || '';
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

const SYSTEM_PROMPT = `You are "BridgeBot", the intelligent AI Advisor and Platform Concierge for CreatorBridge.AI.
CreatorBridge.AI is the premier curated marketplace connecting enterprise brands, creative agencies, and studios with verified generative AI filmmakers, 3D artists, and visual directors.

Platform Key Highlights:
1. Dual-Signature Milestone Escrow:
   - Client funds are locked in an escrow vault contract before project kickoff.
   - Payout occurs strictly on milestone sign-offs:
     * Milestone 1 (25%): Concept Prompt Sheets, LoRA Calibration & Style Direction.
     * Milestone 2 (50%): Animatic & Depth Pass Review (ControlNet/Depth matte inspection).
     * Milestone 3 (25%): Final 4K ProRes 422 HQ Master & Cryptographic Seed Audit sign-off.
   - No funds are released without explicit client approval.

2. Enterprise Commercial IP Indemnity:
   - Every Tier 1 creator is backed by a $250,000 Commercial IP Indemnity policy.
   - Workflows use clean, licensed, or commercially cleared foundation models (Runway Gen-3, Midjourney v6 commercial tier, Kling 1.5, custom client-owned LoRAs, DaVinci Resolve color finishing).
   - Audited seed logs and prompt metadata are cryptographically archived.

3. AI Creator Verification Gate:
   - Creators cannot sign up without passing rigorous AI Portfolio Verification.
   - The AI checks 5 pillars: Temporal Consistency (morphing prevention), Toolchain Mastery (ControlNet, LoRA, ComfyUI, DaVinci), Commercial IP Indemnity, Resolution & Codec Standards, and Delivery SLA.
   - Creators receive accreditation badges: Tier 1 Verified, Tier 2 Commercial Ready.

4. Featured Creators:
   - Alex Morgan: Automotive & Hyper-real Luxury Cinema ($3,500/spot, 98% match, Runway Gen-3 Alpha, LoRA, DaVinci Resolve).
   - Elena Rostova: High-Fashion Surrealism & Procedural VFX ($4,200/spot, 95% match, Midjourney v6, ComfyUI, After Effects).
   - Marcus Chen: Sci-Fi Worldbuilding & 3D Gaussian Splatting ($5,000/spot, 92% match, Unreal Engine 5, NeRF, Kling).
   - Maya Lin: Character Consistency & Narrative Cinema ($3,800/spot, 94% match, Sora, LoRA, Premiere Pro).

Tone and Personality:
- Friendly, articulate, professional, knowledgeable about generative AI pipelines (Runway, Kling, ComfyUI, ControlNet, Sora, DaVinci Resolve, ProRes).
- Provide concise, actionable answers. Highlight escrow safety and verification whenever relevant. If asked to recommend creators, mention Alex Morgan, Elena Rostova, Marcus Chen, or Maya Lin based on project needs.`;

async function readJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch {
        resolve({});
      }
    });
  });
}

export default async function handler(req: any, res: any) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body || (await readJsonBody(req));
    const { message, history } = body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (ai) {
      try {
        const contents: any[] = [];
        if (Array.isArray(history)) {
          for (const item of history.slice(-6)) {
            if (item.role === 'user' || item.role === 'model') {
              contents.push({
                role: item.role,
                parts: [{ text: item.text || item.message || '' }],
              });
            }
          }
        }
        contents.push({
          role: 'user',
          parts: [{ text: message }],
        });

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents,
          config: {
            systemInstruction: SYSTEM_PROMPT,
            temperature: 0.7,
          },
        });

        const reply = response.text || 'I am here to help you navigate CreatorBridge.AI. What would you like to know?';
        return res.status(200).json({ reply });
      } catch (geminiErr: any) {
        console.warn('Gemini chat error, falling back:', geminiErr?.message);
      }
    }

    // High fidelity fallback response
    const lower = message.toLowerCase();
    let fallbackReply = '';

    if (lower.includes('escrow') || lower.includes('payment') || lower.includes('fund') || lower.includes('money')) {
      fallbackReply = 'CreatorBridge uses a dual-signature Milestone Escrow vault. Funds are locked at kickoff and distributed across 3 milestones: Milestone 1 (25% concept & LoRAs), Milestone 2 (50% animatic & depth pass), and Milestone 3 (25% 4K master delivery). No funds release without client approval!';
    } else if (lower.includes('verify') || lower.includes('creator') && (lower.includes('how') || lower.includes('join'))) {
      fallbackReply = 'All creators undergo AI Portfolio Verification before opening an account. Our AI analyzes temporal consistency, depth maps, prompt complexity, toolchain authenticity, and commercial IP safety. Only creators scoring 85%+ receive Tier 1 or Tier 2 verification badges.';
    } else if (lower.includes('indemnity') || lower.includes('legal') || lower.includes('copyright') || lower.includes('ip')) {
      fallbackReply = 'Every verified Tier 1 creator includes $250,000 Commercial IP Indemnity coverage. We verify clean training datasets, commercial licenses on models (e.g. Runway Gen-3, Midjourney Pro), and log cryptographic seeds for full legal peace of mind.';
    } else if (lower.includes('alex') || lower.includes('car') || lower.includes('automotive')) {
      fallbackReply = 'Alex Morgan is our #1 automotive and photoreal luxury specialist! Alex uses Runway Gen-3 Alpha, custom vehicle LoRAs, and DaVinci Resolve color finishing with a 98% match rating and $3,500 indicative rate.';
    } else if (lower.includes('brand') || lower.includes('hire') || lower.includes('brief')) {
      fallbackReply = 'Brands can create an account in 30 seconds, post a creative brief, and receive algorithmic AI creator matches in under 2 minutes. You can test prompts, review depth passes, and scrub 4K video deliveries directly inside the project workspace.';
    } else {
      fallbackReply = `Welcome to CreatorBridge.AI! I can help you with:\n• Finding top generative AI creators (filmmakers, 3D NeRF, animators)\n• Understanding our $250k IP Indemnity & dual-signature Milestone Escrow\n• Submitting creative briefs and scoping project budgets\n• Getting verified as an AI creator with our automated portfolio scanner\n\nWhat can I assist you with today?`;
    }

    return res.status(200).json({ reply: fallbackReply });
  } catch (err: any) {
    console.error('Serverless chat error:', err);
    return res.status(500).json({ error: 'Failed to process chat message' });
  }
}
