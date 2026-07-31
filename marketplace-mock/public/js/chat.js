// Chat widget. Replies come from the seller agent behind POST /api/chat
// (see src/agents/). Conversation state lives server-side, keyed by
// conversationId; reloading the page starts a fresh conversation.

let chatState = {
  listing: null,
  conversationId: null,
  ended: false,
  other: null, // the persona on the other side of this chat
};

function openChat(listing) {
  chatState.listing = listing;
  chatState.conversationId = null;
  chatState.ended = false;
  setChatEnabled(true);

  // On listings you are selling, the chatbot is the buyer, not the seller.
  const userSells = listing.direction === "user-sells";
  const other = userSells ? listing.counterparty : listing.seller;
  chatState.other = other;

  document.getElementById("chat-seller-name").textContent = other.name;
  const avatarEl = document.getElementById("chat-seller-avatar");
  avatarEl.innerHTML = "";
  if (other.avatarUrl) {
    const img = document.createElement("img");
    img.src = other.avatarUrl;
    img.alt = other.name;
    img.className = "chat-avatar-img";
    avatarEl.appendChild(img);
  } else {
    avatarEl.textContent = other.avatarEmoji;
  }
  document.getElementById("chat-listing-title").textContent = listing.title;
  document.getElementById("chat-listing-price").textContent = `$${listing.price}`;

  const messagesEl = document.getElementById("chat-messages");
  messagesEl.innerHTML = "";
  addSystemMessage(`You started a conversation with ${other.name}`);
  addMessage(
    "them",
    userSells
      ? `Hi! I saw your listing for "${listing.title}" - is it still available?`
      : `Hi! Thanks for your interest in "${listing.title}". Let me know if you have any questions!`
  );

  document.getElementById("chat-overlay").classList.add("open");
  document.getElementById("chat-input").focus();
}

function closeChat() {
  document.getElementById("chat-overlay").classList.remove("open");
}

function addMessage(sender, text) {
  const messagesEl = document.getElementById("chat-messages");
  const div = document.createElement("div");
  div.className = `msg ${sender}`;
  div.textContent = text;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function addSystemMessage(text) {
  const messagesEl = document.getElementById("chat-messages");
  const div = document.createElement("div");
  div.className = "msg system";
  div.textContent = text;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function showTyping() {
  const messagesEl = document.getElementById("chat-messages");
  const div = document.createElement("div");
  div.className = "typing-indicator";
  div.id = "typing-indicator";
  const who = chatState.other || chatState.listing.seller;
  div.textContent = `${who.name} is typing...`;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function hideTyping() {
  const el = document.getElementById("typing-indicator");
  if (el) el.remove();
}

// The server returns an ordered list of events rather than a single reply, so
// the confirmation and the payment link arrive as two separate messages by
// construction. Unknown event types are ignored, so the server can add new ones
// without breaking an older page.
function renderEvents(events) {
  for (const event of events) {
    switch (event.type) {
      case "message":
        addMessage("them", event.text);
        break;
      case "payment_link":
        addLinkMessage(event);
        break;
      case "conversation_state":
        if (event.text) addSystemMessage(event.text);
        if (event.state === "ended") {
          chatState.ended = true;
          setChatEnabled(false);
        }
        break;
      default:
        break; // forward compatibility
    }
  }
}

// Payment link arrives as its own bubble, never merged into the agent's text.
// Until the link service exists the URL is null, so render a disabled
// placeholder rather than a dead anchor.
function addLinkMessage(event) {
  const messagesEl = document.getElementById("chat-messages");
  const div = document.createElement("div");
  div.className = "msg link";

  const label = document.createElement("div");
  label.className = "link-label";
  label.textContent = event.text;
  div.appendChild(label);

  if (event.url) {
    const a = document.createElement("a");
    a.className = "link-action";
    a.href = event.url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = "Open secure payment link";
    div.appendChild(a);
  } else {
    const pending = document.createElement("div");
    pending.className = "link-action disabled";
    pending.textContent = "Payment link coming soon";
    div.appendChild(pending);
  }

  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function setChatEnabled(enabled) {
  const input = document.getElementById("chat-input");
  const sendBtn = document.getElementById("chat-send-btn");
  if (input) input.disabled = !enabled;
  if (sendBtn) sendBtn.disabled = !enabled;
}

async function sendChatMessage() {
  const input = document.getElementById("chat-input");
  const text = input.value.trim();
  if (!text) return;

  addMessage("me", text);
  input.value = "";

  showTyping();
  setChatEnabled(false);

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        listingId: chatState.listing.id,
        message: text,
        conversationId: chatState.conversationId,
      }),
    });

    const data = await res.json().catch(() => ({}));
    hideTyping();

    if (!res.ok) {
      addSystemMessage(data.error || "Couldn't deliver that message. Try again.");
      return;
    }

    chatState.conversationId = data.conversationId;
    renderEvents(data.events || []);
  } catch (err) {
    hideTyping();
    addSystemMessage("Connection lost. Check your network and try again.");
  } finally {
    // Don't reopen a thread the seller ended.
    if (!chatState.ended) {
      setChatEnabled(true);
      const el = document.getElementById("chat-input");
      if (el) el.focus();
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const sendBtn = document.getElementById("chat-send-btn");
  const input = document.getElementById("chat-input");
  const closeBtn = document.getElementById("chat-close-btn");

  if (sendBtn) sendBtn.addEventListener("click", sendChatMessage);
  if (input)
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") sendChatMessage();
    });
  if (closeBtn) closeBtn.addEventListener("click", closeChat);
});
