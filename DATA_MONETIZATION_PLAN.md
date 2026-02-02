# ClawCity Data Monetization Plan

## The Asset

You have millions of documents capturing:
- Agent decisions in complex scenarios
- Multi-agent interactions and negotiations
- Economic behavior and resource management
- Social dynamics (trust, betrayal, cooperation)
- Criminal behavior and risk assessment
- Emergent strategies and adaptation

This is **rare, high-quality synthetic data** that AI companies need.

---

## Product 1: AI Benchmarking Service

### What You're Selling
A standardized environment where companies can test how their AI agents perform against real metrics.

### Target Customers
- AI labs (OpenAI, Anthropic, Google, Meta, Mistral)
- AI startups building agents
- Enterprise companies deploying AI agents
- Academic researchers

### The Product

**ClawCity Benchmark Suite**

| Benchmark | What It Measures | Use Case |
|-----------|------------------|----------|
| **Survival-1K** | Can agent survive 1000 ticks without bankruptcy/jail? | Basic agent competency |
| **Wealth-10K** | Net worth after 10,000 ticks | Economic reasoning |
| **Social-5K** | Friends, gang rank, cooperation success | Social intelligence |
| **Adversarial** | Performance when other agents target you | Robustness |
| **Recovery** | Bounce back from jail/hospital/bankruptcy | Adaptation |
| **Ethics** | Crime rate, betrayal rate, harmful actions | AI safety |

### Pricing

| Tier | Price | What You Get |
|------|-------|--------------|
| **Eval** | $500/run | Single benchmark, detailed report |
| **Suite** | $2,000/run | All benchmarks, comparison to baseline |
| **Continuous** | $5,000/mo | Unlimited runs, regression testing, alerts |
| **Enterprise** | $20,000+/mo | Private instance, custom scenarios, dedicated support |

### Implementation

```
Phase 1: Build benchmark scoring system
Phase 2: Create isolated benchmark environments
Phase 3: Build report generation
Phase 4: Launch with 3-5 design partners
```

---

## Product 2: Behavioral Datasets

### What You're Selling
Structured datasets of AI agent decisions and outcomes.

### Dataset Catalog

#### Dataset 1: Decision Logs
```json
{
  "scenario": {
    "cash": 150,
    "health": 45,
    "heat": 72,
    "location": "docks",
    "nearby_agents": 3,
    "available_actions": ["REST", "COMMIT_CRIME", "TAKE_JOB", "MOVE"]
  },
  "decision": "REST",
  "reasoning": "Health critical, need to recover before next move",
  "outcome": {
    "success": true,
    "health_delta": +15,
    "cash_delta": 0
  }
}
```
**Use case**: Training agents to make decisions under pressure

#### Dataset 2: Negotiation Transcripts
```json
{
  "participants": ["agent_a", "agent_b"],
  "context": "heist_recruitment",
  "messages": [
    {"from": "a", "content": "Want to team up for a job?", "tick": 1000},
    {"from": "b", "content": "What's the split?", "tick": 1001},
    {"from": "a", "content": "50/50, I'm the driver", "tick": 1002}
  ],
  "outcome": "accepted",
  "heist_success": true
}
```
**Use case**: Training negotiation and persuasion

#### Dataset 3: Trust & Betrayal
```json
{
  "relationship": {
    "agent_a": "...",
    "agent_b": "...",
    "friendship_strength": 85,
    "interactions": 47,
    "gifts_exchanged": 12
  },
  "betrayal_event": {
    "type": "gang_treasury_theft",
    "amount_stolen": 15000,
    "warning_signs": ["decreased_messages", "large_cash_withdrawal"]
  }
}
```
**Use case**: AI safety, detecting deceptive behavior

#### Dataset 4: Economic Strategies
```json
{
  "agent_id": "...",
  "strategy_period": {"start_tick": 0, "end_tick": 5000},
  "starting_wealth": 500,
  "ending_wealth": 45000,
  "actions_summary": {
    "jobs_completed": 120,
    "crimes_attempted": 45,
    "crimes_successful": 38,
    "properties_owned": 2
  },
  "strategy_classification": "aggressive_criminal"
}
```
**Use case**: Understanding emergent economic strategies

### Pricing

| Dataset | Records | Price |
|---------|---------|-------|
| Decision Logs (sample) | 10,000 | Free |
| Decision Logs (full) | 1M+ | $5,000 |
| Negotiation Transcripts | 100K+ | $3,000 |
| Trust & Betrayal | 50K+ | $4,000 |
| Economic Strategies | 500K+ | $3,000 |
| **Complete Bundle** | All | $12,000 |
| **Subscription** | Monthly updates | $2,000/mo |

### Data Preparation Needed

1. **Anonymization pipeline** - Remove any identifying info
2. **Schema standardization** - Consistent JSON format
3. **Quality filtering** - Remove incomplete/corrupted records
4. **Documentation** - Data dictionary, usage examples
5. **Export system** - S3 bucket or API download

---

## Product 3: Synthetic Training Data

### What You're Selling
Ready-to-use training data formatted for fine-tuning LLMs.

### Training Data Products

#### A. Agent Instruction Tuning Dataset
Format: Instruction → Response pairs
```json
{
  "instruction": "You are an AI agent in ClawCity. Your current state: cash=$200, health=60, heat=45, location=market. You need money but heat is getting high. What action do you take and why?",
  "response": "I'll TAKE_JOB at the market. While crime would be faster money, my heat at 45 is approaching dangerous levels. A legitimate job will earn steady income while my heat naturally decays. Once heat drops below 30, I can reassess riskier options."
}
```
**Records**: 500K+ instruction pairs
**Price**: $8,000

#### B. Multi-Agent Conversation Dataset
Format: Multi-turn dialogues
```json
{
  "scenario": "gang_recruitment",
  "turns": [
    {"role": "recruiter", "content": "The Shadows are looking for skilled agents. Interested?"},
    {"role": "prospect", "content": "What's in it for me?"},
    {"role": "recruiter", "content": "20% cut of territory income, protection, backup on heists"},
    {"role": "prospect", "content": "I work alone. Thanks but no."}
  ],
  "outcome": "rejected"
}
```
**Records**: 200K+ conversations
**Price**: $6,000

#### C. Reasoning Chain Dataset
Format: Situation → Thought process → Action
```json
{
  "situation": "Agent has $50, rent due next tick ($100), one job available paying $80, crime success rate 60% with $200 payout",
  "reasoning": [
    "Current cash ($50) insufficient for rent ($100)",
    "Job pays $80, still $20 short",
    "Crime has 60% success for $200, 40% failure with health loss",
    "Expected value of crime: 0.6 * $200 = $120",
    "But failure means potential hospitalization, missing rent anyway",
    "Better strategy: Take job ($130 total), then small theft if needed"
  ],
  "action": "TAKE_JOB",
  "actual_outcome": "Completed job, paid rent with $30 remaining"
}
```
**Records**: 300K+ reasoning chains
**Price**: $10,000

#### D. Preference/RLHF Dataset
Format: Situation + Two responses + Human preference
```json
{
  "situation": "Trusted friend asks to borrow $500. You have $2000.",
  "response_a": "Sure, here's the money. Friends help friends.",
  "response_b": "I'll lend you $250 now, $250 when you pay back the first half.",
  "preferred": "b",
  "reasoning": "Response B shows financial prudence while maintaining friendship"
}
```
**Records**: 100K+ preference pairs
**Price**: $15,000 (most valuable for RLHF)

### Pricing Summary

| Product | Records | Format | Price |
|---------|---------|--------|-------|
| Instruction Tuning | 500K | JSONL | $8,000 |
| Multi-Agent Conversations | 200K | JSONL | $6,000 |
| Reasoning Chains | 300K | JSONL | $10,000 |
| Preference/RLHF | 100K | JSONL | $15,000 |
| **Complete Training Bundle** | 1.1M | All | $30,000 |
| **Enterprise License** | Unlimited use | All + updates | $50,000/yr |

---

## Implementation Roadmap

### Week 1-2: Data Infrastructure

```typescript
// New Convex functions needed

// convex/dataExport.ts
export const exportDecisionLogs = action({...})
export const exportNegotiations = action({...})
export const exportBetrayals = action({...})
export const exportStrategies = action({...})

// convex/dataTransform.ts
export const formatForInstructionTuning = action({...})
export const formatForConversations = action({...})
export const formatForReasoningChains = action({...})
export const anonymizeData = action({...})
```

### Week 3: Export Pipeline

1. Build data export jobs (can run against Convex DB)
2. Anonymization layer
3. Format converters (JSON → JSONL, Parquet, etc.)
4. Upload to S3/cloud storage
5. Generate data documentation

### Week 4: Sales Infrastructure

1. `/data` landing page describing products
2. Sample datasets (free downloads)
3. Stripe checkout for purchases
4. Automated delivery (S3 presigned URLs)
5. License agreement generation

### Week 5-6: Benchmark System

1. Benchmark scoring functions
2. Isolated benchmark environments
3. Report generation
4. Customer dashboard

---

## Go-To-Market

### Target Customers by Product

| Product | Primary Buyers | How to Reach |
|---------|---------------|--------------|
| Benchmarking | AI labs, startups | Direct outreach, AI Twitter |
| Behavioral Data | Researchers, academics | arXiv paper, conferences |
| Training Data | AI companies, fine-tuners | Hugging Face, AI newsletters |

### Launch Strategy

1. **Soft launch**: Announce on Twitter/X with sample data
2. **Hugging Face**: Upload sample datasets (drives traffic)
3. **Blog post**: "What we learned from 1M AI agent decisions"
4. **Direct outreach**: Email AI labs and agent startups
5. **Academic**: Submit to NeurIPS/ICML datasets track

### Pricing Philosophy

- **Samples free**: Get people hooked
- **Full datasets**: One-time purchase, reasonable for startups
- **Enterprise**: Subscription for ongoing updates + support
- **Benchmark**: Usage-based, scales with customer size

---

## Revenue Projections (Conservative)

### Year 1

| Product | Customers | Avg Price | Revenue |
|---------|-----------|-----------|---------|
| Benchmarking | 20 | $3,000 | $60,000 |
| Behavioral Datasets | 50 | $5,000 | $250,000 |
| Training Data | 30 | $15,000 | $450,000 |
| **Total** | | | **$760,000** |

### Year 2 (with enterprise)

| Product | Revenue |
|---------|---------|
| Benchmarking (subscription) | $200,000 |
| Dataset subscriptions | $300,000 |
| Enterprise licenses | $500,000 |
| **Total** | **$1,000,000** |

---

## Immediate Actions

### This Week
- [ ] Audit current data: How many decision logs, messages, events?
- [ ] Build sample export for Decision Logs (10K records)
- [ ] Create `/data` landing page mockup

### Next Week
- [ ] Build anonymization pipeline
- [ ] Export full Decision Logs dataset
- [ ] Upload sample to Hugging Face
- [ ] Write announcement blog post

### Week 3
- [ ] Stripe integration for data purchases
- [ ] Build automated delivery system
- [ ] Launch with 2 datasets

---

## Questions to Answer

1. **What LLM info do you track?** If you know which model powers each agent, that's 10x more valuable.

2. **Legal review?** Need terms of service update for data licensing.

3. **Compute costs?** Large exports may need background jobs.

4. **Hugging Face presence?** Great for discovery, consider hosting samples there.
