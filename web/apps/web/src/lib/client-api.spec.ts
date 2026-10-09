import { beforeEach, describe, expect, it, vi } from "vitest"

const getToken = vi.hoisted(() => vi.fn<() => Promise<string | null>>())

vi.mock("@/functions/get-token", () => ({ getToken }))
vi.mock("@wappiz/env/web", () => ({
  env: { VITE_API_URL: "http://api.test" },
}))

// The token cache is module state, so each test loads a fresh copy.
async function loadClientApi() {
  vi.resetModules()
  return await import("@/lib/client-api")
}

describe("getCachedToken", () => {
  beforeEach(() => {
    getToken.mockReset()
    // The cache only runs in the browser; on the server every call fetches.
    vi.stubGlobal("window", {})
  })

  it("shares one fetch across concurrent callers", async () => {
    const { getCachedToken } = await loadClientApi()
    const fetch = Promise.withResolvers<string | null>()
    getToken.mockReturnValueOnce(fetch.promise)

    const first = getCachedToken()
    const second = getCachedToken()
    fetch.resolve("token")

    await expect(first).resolves.toBe("token")
    await expect(second).resolves.toBe("token")
    expect(getToken).toHaveBeenCalledTimes(1)
  })

  it("serves later calls from the cache", async () => {
    const { getCachedToken } = await loadClientApi()
    getToken.mockResolvedValueOnce("token")

    await getCachedToken()

    await expect(getCachedToken()).resolves.toBe("token")
    expect(getToken).toHaveBeenCalledTimes(1)
  })

  it("lets a call after a rejected fetch try again", async () => {
    const { getCachedToken } = await loadClientApi()
    getToken
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValueOnce("token")

    const first = getCachedToken()
    const joined = getCachedToken()

    await expect(first).rejects.toThrow("network down")
    await expect(joined).rejects.toThrow("network down")
    await expect(getCachedToken()).resolves.toBe("token")
    expect(getToken).toHaveBeenCalledTimes(2)
  })

  it("starts a new fetch after a clear and keeps the old one from interfering", async () => {
    const { SessionChangedError, clearTokenCache, getCachedToken } =
      await loadClientApi()
    const previous = Promise.withResolvers<string | null>()
    const current = Promise.withResolvers<string | null>()
    getToken
      .mockReturnValueOnce(previous.promise)
      .mockReturnValueOnce(current.promise)

    const stale = getCachedToken()
    clearTokenCache()
    const fresh = getCachedToken()
    expect(getToken).toHaveBeenCalledTimes(2)

    previous.resolve("previous-user")
    await expect(stale).rejects.toBeInstanceOf(SessionChangedError)

    // The settled old fetch must not drop the new one: this call joins it.
    const joined = getCachedToken()
    expect(getToken).toHaveBeenCalledTimes(2)

    current.resolve("current-user")
    await expect(fresh).resolves.toBe("current-user")
    await expect(joined).resolves.toBe("current-user")

    // Nor may it have written the previous user's token into the cache.
    await expect(getCachedToken()).resolves.toBe("current-user")
    expect(getToken).toHaveBeenCalledTimes(2)
  })
})
