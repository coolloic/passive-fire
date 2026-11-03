import { afterEach, describe, expect, it, vi } from "vitest";
import { logger } from "./logger";

describe("logger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("forwards info with context", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    logger.info("hello", { id: 1 });
    expect(spy).toHaveBeenCalledWith("hello", { id: 1 });
  });

  it("defaults info context to an empty object", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    logger.info("plain");
    expect(spy).toHaveBeenCalledWith("plain", {});
  });

  it("defaults context to an empty object", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    logger.warn("careful");
    expect(spy).toHaveBeenCalledWith("careful", {});
  });

  it("forwards errors with the error object", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const failure = new Error("boom");
    logger.error("failed", failure);
    expect(spy).toHaveBeenCalledWith("failed", failure, {});
  });
});
