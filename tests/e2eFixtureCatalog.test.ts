import { afterEach, describe, expect, it } from "vitest";
import { isE2EFixtureActive } from "@/lib/e2eFixtureCatalog";

const ORIGINAL_VERCEL_ENV = process.env.VERCEL_ENV;
const ORIGINAL_FLAG = process.env.E2E_FIXTURE_CATALOG;

afterEach(() => {
  if (ORIGINAL_VERCEL_ENV === undefined) delete process.env.VERCEL_ENV;
  else process.env.VERCEL_ENV = ORIGINAL_VERCEL_ENV;
  if (ORIGINAL_FLAG === undefined) delete process.env.E2E_FIXTURE_CATALOG;
  else process.env.E2E_FIXTURE_CATALOG = ORIGINAL_FLAG;
});

describe("E2E fixture catalog: impossible to activate in production", () => {
  it("is off by default (no env vars set)", () => {
    delete process.env.VERCEL_ENV;
    delete process.env.E2E_FIXTURE_CATALOG;
    expect(isE2EFixtureActive()).toBe(false);
  });

  it("is off even with the flag set, if VERCEL_ENV is production", () => {
    process.env.VERCEL_ENV = "production";
    process.env.E2E_FIXTURE_CATALOG = "true";
    expect(isE2EFixtureActive()).toBe(false);
  });

  it("is off on preview/no-VERCEL_ENV if the flag isn't set", () => {
    delete process.env.VERCEL_ENV;
    delete process.env.E2E_FIXTURE_CATALOG;
    expect(isE2EFixtureActive()).toBe(false);
    process.env.VERCEL_ENV = "preview";
    expect(isE2EFixtureActive()).toBe(false);
  });

  it("is only on when the flag is set AND VERCEL_ENV is not production", () => {
    process.env.VERCEL_ENV = "preview";
    process.env.E2E_FIXTURE_CATALOG = "true";
    expect(isE2EFixtureActive()).toBe(true);

    delete process.env.VERCEL_ENV; // e.g. local dev
    expect(isE2EFixtureActive()).toBe(true);
  });
});
