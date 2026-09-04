import { ImageManipulator } from "expo-image-manipulator";

import { getSupabase } from "../lib/supabase";
import { logSosEvent } from "./sos";
import { fetchPhotos, saveReinforcementPhoto } from "./photos";

jest.mock("expo-image-manipulator", () => ({
  ImageManipulator: { manipulate: jest.fn() },
  SaveFormat: { JPEG: "jpeg" },
}));

jest.mock("../lib/supabase", () => ({
  getSupabase: jest.fn(),
}));

jest.mock("./sos", () => ({
  logSosEvent: jest.fn(),
}));

const mockedGetSupabase = jest.mocked(getSupabase);
const mockedLogSosEvent = jest.mocked(logSosEvent);
const mockedManipulate = jest.mocked(ImageManipulator.manipulate);
const mockedFetch = jest.fn();

describe("reinforcement photo data", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    globalThis.fetch = mockedFetch;
    mockedLogSosEvent.mockResolvedValue(undefined);
  });

  test("rejects invalid Hard Truths before image processing", async () => {
    await expect(
      saveReinforcementPhoto({
        caption: "",
        mode: "hard_truths",
        path: "off_the_rails",
        tag: "never_again",
        uri: "file:///draft.heic",
        width: 2400,
      }),
    ).rejects.toThrow("Write your own caption before saving.");

    expect(mockedManipulate).not.toHaveBeenCalled();
    expect(mockedGetSupabase).not.toHaveBeenCalled();
  });

  test("compresses and uploads before inserting and logging Why", async () => {
    const saveAsync = jest.fn().mockResolvedValue({
      height: 900,
      uri: "file:///compressed.jpg",
      width: 1600,
    });
    const renderAsync = jest.fn().mockResolvedValue({ saveAsync });
    const resize = jest.fn();
    mockedManipulate.mockReturnValue({
      renderAsync,
      resize,
    } as never);
    mockedFetch.mockResolvedValue({
      blob: jest.fn().mockResolvedValue({ size: 1234, type: "image/jpeg" }),
      ok: true,
    });

    const insert = jest.fn().mockResolvedValue({ error: null });
    const upload = jest.fn().mockResolvedValue({ error: null });
    mockedGetSupabase.mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
      from: jest.fn().mockReturnValue({ insert }),
      storage: {
        from: jest.fn().mockReturnValue({ upload }),
      },
    } as never);

    await saveReinforcementPhoto({
      caption: "  My family  ",
      mode: "remember_why",
      path: "planned_event",
      uri: "file:///draft.heic",
      width: 2400,
    });

    expect(resize).toHaveBeenCalledWith({ height: null, width: 1600 });
    expect(saveAsync).toHaveBeenCalledWith({
      compress: 0.7,
      format: "jpeg",
    });
    expect(upload).toHaveBeenCalledWith(
      expect.stringMatching(/^user-1\/[0-9a-f-]+\.jpg$/),
      { size: 1234, type: "image/jpeg" },
      { contentType: "image/jpeg", upsert: false },
    );
    expect(insert).toHaveBeenCalledWith({
      caption: "My family",
      mode: "remember_why",
      storage_key: expect.stringMatching(/^user-1\/[0-9a-f-]+\.jpg$/),
      tag: "remember_why",
      user_id: "user-1",
    });
    expect(mockedLogSosEvent).toHaveBeenCalledWith("planned_event", "why");
    expect(upload.mock.invocationCallOrder[0]).toBeLessThan(
      insert.mock.invocationCallOrder[0],
    );
    expect(insert.mock.invocationCallOrder[0]).toBeLessThan(
      mockedLogSosEvent.mock.invocationCallOrder[0],
    );
  });

  test("does not insert a photo row when storage upload fails", async () => {
    mockedManipulate.mockReturnValue({
      renderAsync: jest.fn().mockResolvedValue({
        saveAsync: jest.fn().mockResolvedValue({
          height: 800,
          uri: "file:///compressed.jpg",
          width: 1200,
        }),
      }),
      resize: jest.fn(),
    } as never);
    mockedFetch.mockResolvedValue({
      blob: jest.fn().mockResolvedValue({ size: 900, type: "image/jpeg" }),
      ok: true,
    });

    const insert = jest.fn();
    mockedGetSupabase.mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
      from: jest.fn().mockReturnValue({ insert }),
      storage: {
        from: jest.fn().mockReturnValue({
          upload: jest.fn().mockResolvedValue({
            error: { message: "Upload unavailable" },
          }),
        }),
      },
    } as never);

    await expect(
      saveReinforcementPhoto({
        caption: "My reminder",
        mode: "hard_truths",
        path: "off_the_rails",
        tag: "proud_of_this",
        uri: "file:///draft.jpg",
        width: 1200,
      }),
    ).rejects.toThrow("Upload unavailable");

    expect(insert).not.toHaveBeenCalled();
    expect(mockedLogSosEvent).not.toHaveBeenCalled();
  });

  test("fetches photos by mode with one-hour signed URLs", async () => {
    const rows = [
      {
        caption: "Keep going",
        created_at: "2026-09-04T10:00:00.000Z",
        id: "photo-1",
        mode: "remember_why",
        storage_key: "user-1/photo-1.jpg",
        tag: "remember_why",
        user_id: "user-1",
      },
    ];
    const order = jest.fn().mockResolvedValue({ data: rows, error: null });
    const eq = jest.fn().mockReturnValue({ order });
    const select = jest.fn().mockReturnValue({ eq });
    const createSignedUrl = jest.fn().mockResolvedValue({
      data: { signedUrl: "https://example.test/photo-1" },
      error: null,
    });
    mockedGetSupabase.mockReturnValue({
      from: jest.fn().mockReturnValue({ select }),
      storage: {
        from: jest.fn().mockReturnValue({ createSignedUrl }),
      },
    } as never);

    await expect(fetchPhotos("remember_why")).resolves.toEqual([
      { ...rows[0], signed_url: "https://example.test/photo-1" },
    ]);
    expect(eq).toHaveBeenCalledWith("mode", "remember_why");
    expect(order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(createSignedUrl).toHaveBeenCalledWith("user-1/photo-1.jpg", 3600);
  });
});
