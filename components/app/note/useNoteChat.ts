"use client";

import { useEffect, useState } from "react";
import type { Topic } from "@/lib/types";
import { sendChat } from "@/lib/chatClient";

export interface ChatMessage {
  id: string;
  sender: "user" | "ai" | "typing" | "default";
  text: string;
}

export interface NoteChatState {
  messages: ChatMessage[];
  inputText: string;
  setInputText: (v: string) => void;
  isLoading: boolean;
  send: () => void;
}

const GREETING: ChatMessage = { id: "default", sender: "default", text: "Ask me anything about this note." };

function buildContext(topic: Topic | null) {
  let context = "Here is the study material:\n\n";
  if (!topic) return context;
  if (topic.title) context += `Title: ${topic.title}\n\n`;
  const note = topic.note;
  if (note) {
    if (note.quick_summary) context += `Summary:\n${note.quick_summary}\n\n`;
    if (note.key_findings?.length) context += `Key Findings:\n${note.key_findings.map((f) => `- ${f}`).join("\n")}\n\n`;
    if (note.detailed_notes) context += `Detailed Notes:\n${note.detailed_notes}\n\n`;
    if (note.sections?.length) {
      context += "Cheat Sheet Sections:\n";
      note.sections.forEach((section) => {
        context += `\n## ${section.title}\n${section.content}\n`;
        if (section.keyTerms?.length) context += `Key terms: ${section.keyTerms.join(", ")}\n`;
      });
      context += "\n";
    }
    if (note.important_notes?.length) context += `Important Notes:\n${note.important_notes.map((n) => `- ${n}`).join("\n")}\n\n`;
  }
  if (topic.flashcards?.length) {
    context += "Flashcards:\n";
    topic.flashcards.forEach((card, i) => {
      context += `${i + 1}. Q: ${card.question}\n   A: ${card.answer}\n`;
    });
    context += "\n";
  }
  if (topic.quiz?.length) {
    context += "Quiz Questions:\n";
    topic.quiz.forEach((q, i) => {
      context += `${i + 1}. ${q.question}\n   Correct Answer: ${q.correct_answer}\n`;
    });
  }
  return context;
}

/** Note chat: history persisted per profile and note (chat_<profileId>_<topicId>), answers from /api/chat. */
export function useNoteChat(profileId: number | null, topicId: string, topic: Topic | null): NoteChatState {
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Restore this note's history once the profile is known.
  useEffect(() => {
    if (profileId === null) return;
    try {
      const stored = localStorage.getItem(`chat_${profileId}_${topicId}`);
      const parsed = stored ? JSON.parse(stored) : null;
      if (Array.isArray(parsed) && parsed.length > 0) setMessages(parsed);
    } catch {
      // keep the greeting
    }
  }, [profileId, topicId]);

  // Persist once there is a real conversation (skips the greeting and typing indicators).
  useEffect(() => {
    if (profileId === null || !messages.some((m) => m.sender === "user")) return;
    const persistable = messages.filter((m) => m.sender === "user" || m.sender === "ai");
    try {
      localStorage.setItem(`chat_${profileId}_${topicId}`, JSON.stringify(persistable));
    } catch {
      // storage full or blocked
    }
  }, [messages, profileId, topicId]);

  const send = async () => {
    const question = inputText.trim();
    if (!question || isLoading) return;
    setMessages((prev) => [...prev, { id: Date.now().toString(), sender: "user", text: question }, { id: "typing", sender: "typing", text: "" }]);
    setInputText("");
    setIsLoading(true);
    try {
      // /api/chat requires a signed-in caller (meters every message), so the
      // request goes through sendChat, which attaches the Firebase ID token.
      const reply = await sendChat(question, buildContext(topic));
      const text = reply.ok
        ? reply.answer
        : reply.signIn
          ? reply.message
          : `The answer didn't load: ${reply.message}. Send the question again.`;
      setMessages((prev) => [...prev.filter((m) => m.id !== "typing"), { id: Date.now().toString(), sender: "ai", text }]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== "typing"),
        { id: Date.now().toString(), sender: "ai", text: "The message didn't send. Check your connection and send it again." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return { messages, inputText, setInputText, isLoading, send: () => void send() };
}
