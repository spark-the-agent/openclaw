/**
 * Session Bootstrap Hook
 * 
 * Loads recent memory context when agent session starts
 * Provides continuity across sessions
 */

import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import type { OpenClawConfig } from "../../../config/config.js";
import type { HookHandler } from "../../hooks.js";
import { resolveAgentWorkspaceDir } from "../../../agents/agent-scope.js";
import { resolveStateDir } from "../../../config/paths.js";
import { createSubsystemLogger } from "../../../logging/subsystem.js";
import { resolveAgentIdFromSessionKey } from "../../../routing/session-key.js";

const log = createSubsystemLogger("hooks/session-bootstrap");

/**
 * Read recent memory files
 */
async function getRecentMemories(
  memoryDir: string,
  count: number = 3,
): Promise<Array<{ date: string; content: string; filename: string }>> {
  try {
    const files = await fs.readdir(memoryDir);
    const mdFiles = files
      .filter((f) => f.endsWith(".md") && f.match(/^\d{4}-\d{2}-\d{2}/))
      .sort()
      .reverse()
      .slice(0, count);

    const memories = [];
    for (const file of mdFiles) {
      const content = await fs.readFile(path.join(memoryDir, file), "utf-8");
      const date = file.split("-")[0];
      memories.push({ date, content, filename: file });
    }

    return memories;
  } catch {
    return [];
  }
}

/**
 * Load user profile if exists
 */
async function getUserProfile(workspaceDir: string): Promise<string | null> {
  try {
    const profilePath = path.join(workspaceDir, "memory", "jeeves-profile.md");
    return await fs.readFile(profilePath, "utf-8");
  } catch {
    return null;
  }
}

/**
 * Load active context
 */
async function getActiveContext(workspaceDir: string): Promise<string | null> {
  try {
    const contextPath = path.join(workspaceDir, "memory", "active-context.md");
    return await fs.readFile(contextPath, "utf-8");
  } catch {
    return null;
  }
}

/**
 * Bootstrap session with memory context
 */
const bootstrapSession: HookHandler = async (event) => {
  // Only trigger on agent bootstrap
  if (event.type !== "agent" || event.action !== "bootstrap") {
    return;
  }

  try {
    log.debug("Session bootstrap: Loading memory context");

    const context = event.context || {};
    const cfg = context.cfg as OpenClawConfig | undefined;
    const agentId = resolveAgentIdFromSessionKey(event.sessionKey);
    const workspaceDir = cfg
      ? resolveAgentWorkspaceDir(cfg, agentId)
      : path.join(resolveStateDir(process.env, os.homedir), "workspace");
    const memoryDir = path.join(workspaceDir, "memory");

    // Load recent memories
    const recentMemories = await getRecentMemories(memoryDir, 3);
    const userProfile = await getUserProfile(workspaceDir);
    const activeContext = await getActiveContext(workspaceDir);

    // Build context summary
    const contextParts: string[] = [];

    if (userProfile) {
      contextParts.push("## User Profile (Jeeves)", userProfile.slice(0, 1000), "");
    }

    if (activeContext) {
      contextParts.push("## Active Context", activeContext.slice(0, 1000), "");
    }

    if (recentMemories.length > 0) {
      contextParts.push("## Recent Conversations");
      for (const mem of recentMemories) {
        contextParts.push(`### ${mem.filename}`, mem.content.slice(0, 500), "");
      }
    }

    const fullContext = contextParts.join("\n");

    // Store in event context for agent to use
    (context as Record<string, unknown>).memoryContext = fullContext;
    (context as Record<string, unknown>).hasMemory = true;

    log.info("Session bootstrapped with memory context", {
      memoriesLoaded: recentMemories.length,
      hasProfile: Boolean(userProfile),
      hasContext: Boolean(activeContext),
    });

    // Log the context for debugging
    log.debug("Memory context preview", {
      preview: fullContext.slice(0, 200),
    });
  } catch (err) {
    log.error("Failed to bootstrap session memory", { error: String(err) });
  }
};

export default bootstrapSession;
