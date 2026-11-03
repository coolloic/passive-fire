import type { AnyHandler } from "msw";

// Default network handlers shared by all unit tests. Override per test with `server.use(...)`.
export const handlers: AnyHandler[] = [];
