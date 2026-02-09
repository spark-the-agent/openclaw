# Session Bootstrap Hook

Loads recent memory context when an agent session starts, providing continuity across conversations.

## Purpose

Solves the "blank slate" problem - when Spark wakes up, he should know:
- What you (Jeeves) have been working on
- Recent conversations and context
- Active projects and pending tasks

## When It Runs

Triggered on `agent:bootstrap` event - every time a new session starts.

## What It Loads

1. **User Profile** (`memory/jeeves-profile.md`)
   - Your preferences, communication style
   - Recent projects, goals
   - What you've been building

2. **Active Context** (`memory/active-context.md`)
   - Current tasks and priorities
   - Pending decisions
   - Recent insights

3. **Recent Session Memories** (`memory/YYYY-MM-DD-*.md`)
   - Last 3 conversation summaries
   - Automatically created by `session-memory` hook

## How Spark Uses It

The loaded context is injected into the agent's system prompt, allowing Spark to:
- Reference previous conversations
- Continue ongoing projects
- Recognize patterns in your work
- Provide personalized assistance

## Files Created/Managed

- Reads from `workspace/memory/`
- No new files created by this hook
- Relies on `session-memory` hook for memory generation

## Future Enhancements

- [ ] Semantic search across all memories
- [ ] Automatic user model updates
- [ ] Episodic memory with emotional valence
- [ ] Theory of mind: modeling what you know vs don't know
