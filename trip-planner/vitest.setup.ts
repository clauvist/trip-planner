import { vi } from "vitest";

// Mock server-only to prevent errors in test environment
vi.mock("server-only", () => ({}));
