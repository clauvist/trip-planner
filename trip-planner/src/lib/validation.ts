export function validateUsername(username: string): string | null {
  if (username.length < 3 || username.length > 30) {
    return "Username must be 3-30 characters.";
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    return "Username can only contain letters, numbers, underscores, and hyphens.";
  }
  return null;
}

export function validateEmail(email: string): string | null {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "Enter a valid email address.";
  }
  return null;
}
