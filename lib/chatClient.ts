// Client side of /api/chat. The route requires a signed-in caller and meters
// every message, so this attaches the Firebase ID token and turns the
// route's status codes into one message the chat UI can show.
import { auth } from "@/lib/firebase";

export type ChatReply = { ok: true; answer: string } | { ok: false; message: string; signIn?: boolean };

export async function sendChat(question: string, context: string): Promise<ChatReply> {
  const user = auth?.currentUser;
  if (!user) {
    return { ok: false, message: "Sign in to chat with this note. It's free.", signIn: true };
  }

  let response: Response;
  try {
    const token = await user.getIdToken();
    response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ question, context }),
    });
  } catch {
    return { ok: false, message: "Could not reach the assistant." };
  }

  const result = await response.json().catch(() => ({}));
  if (response.ok && result.answer) return { ok: true, answer: result.answer };
  if (response.status === 401) {
    return { ok: false, message: "Sign in to chat with this note. It's free.", signIn: true };
  }
  return { ok: false, message: result.error || "Failed to get response" };
}
