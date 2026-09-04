import { getSupabase } from "../lib/supabase";
import {
  createAccountabilityContact,
  fetchAccountabilityContacts,
  removeAccountabilityContact,
} from "./accountabilityContacts";

jest.mock("../lib/supabase", () => ({
  getSupabase: jest.fn(),
}));

const mockedGetSupabase = jest.mocked(getSupabase);

const signedInAuth = {
  getUser: jest.fn().mockResolvedValue({
    data: { user: { id: "user-1" } },
    error: null,
  }),
};

const signedOutAuth = {
  getUser: jest.fn().mockResolvedValue({
    data: { user: null },
    error: null,
  }),
};

describe("fetchAccountabilityContacts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns active contacts for the signed-in user in creation order", async () => {
    const contacts = [
      {
        id: "contact-1",
        name: "Jamie Rivera",
        phone: "(555) 123-4567",
        email: "jamie@example.com",
        relationship: "friend",
      },
    ];
    const idOrder = jest.fn().mockResolvedValue({ data: contacts, error: null });
    const createdOrder = jest.fn().mockReturnValue({ order: idOrder });
    const activeFilter = jest.fn().mockReturnValue({ order: createdOrder });
    const ownerFilter = jest.fn().mockReturnValue({ eq: activeFilter });
    const select = jest.fn().mockReturnValue({ eq: ownerFilter });
    mockedGetSupabase.mockReturnValue({
      auth: signedInAuth,
      from: jest.fn().mockReturnValue({ select }),
    } as never);

    await expect(fetchAccountabilityContacts()).resolves.toEqual(contacts);
    expect(select).toHaveBeenCalledWith("id, name, phone, email, relationship");
    expect(ownerFilter).toHaveBeenCalledWith("user_id", "user-1");
    expect(activeFilter).toHaveBeenCalledWith("deleted", false);
    expect(createdOrder).toHaveBeenCalledWith("created_at", { ascending: true });
    expect(idOrder).toHaveBeenCalledWith("id", { ascending: true });
  });

  test("propagates Supabase fetch errors", async () => {
    const idOrder = jest.fn().mockResolvedValue({
      data: null,
      error: { message: "Contact fetch failed" },
    });
    mockedGetSupabase.mockReturnValue({
      auth: signedInAuth,
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({ order: idOrder }),
            }),
          }),
        }),
      }),
    } as never);

    await expect(fetchAccountabilityContacts()).rejects.toThrow(
      "Contact fetch failed",
    );
  });

  test("rejects when the user is not signed in", async () => {
    mockedGetSupabase.mockReturnValue({
      auth: signedOutAuth,
      from: jest.fn(),
    } as never);

    await expect(fetchAccountabilityContacts()).rejects.toThrow(
      "You must be signed in to manage accountability contacts.",
    );
  });
});

describe("createAccountabilityContact", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("inserts an owner-scoped contact and returns the created row", async () => {
    const created = {
      id: "contact-1",
      name: "Jamie Rivera",
      phone: "(555) 123-4567",
      email: "jamie@example.com",
      relationship: "friend",
    };
    const single = jest.fn().mockResolvedValue({ data: created, error: null });
    const select = jest.fn().mockReturnValue({ single });
    const insert = jest.fn().mockReturnValue({ select });
    mockedGetSupabase.mockReturnValue({
      auth: signedInAuth,
      from: jest.fn().mockReturnValue({ insert }),
    } as never);

    await expect(
      createAccountabilityContact({
        name: "Jamie Rivera",
        phone: "(555) 123-4567",
        email: "jamie@example.com",
        relationship: "friend",
      }),
    ).resolves.toEqual(created);
    expect(insert).toHaveBeenCalledWith({
      user_id: "user-1",
      name: "Jamie Rivera",
      phone: "(555) 123-4567",
      email: "jamie@example.com",
      relationship: "friend",
    });
    expect(select).toHaveBeenCalledWith("id, name, phone, email, relationship");
    expect(single).toHaveBeenCalledTimes(1);
  });

  test("propagates Supabase insert errors", async () => {
    const single = jest.fn().mockResolvedValue({
      data: null,
      error: { message: "Contact insert failed" },
    });
    mockedGetSupabase.mockReturnValue({
      auth: signedInAuth,
      from: jest.fn().mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({ single }),
        }),
      }),
    } as never);

    await expect(
      createAccountabilityContact({
        name: "Jamie Rivera",
        phone: "(555) 123-4567",
        email: "jamie@example.com",
        relationship: "friend",
      }),
    ).rejects.toThrow("Contact insert failed");
  });

  test("rejects when the user is not signed in", async () => {
    mockedGetSupabase.mockReturnValue({
      auth: signedOutAuth,
      from: jest.fn(),
    } as never);

    await expect(
      createAccountabilityContact({
        name: "Jamie Rivera",
        phone: "(555) 123-4567",
        email: "jamie@example.com",
        relationship: "friend",
      }),
    ).rejects.toThrow(
      "You must be signed in to manage accountability contacts.",
    );
  });
});

describe("removeAccountabilityContact", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("soft-deletes only the signed-in user's active contact", async () => {
    const activeFilter = jest.fn().mockResolvedValue({ error: null });
    const ownerFilter = jest.fn().mockReturnValue({ eq: activeFilter });
    const idFilter = jest.fn().mockReturnValue({ eq: ownerFilter });
    const update = jest.fn().mockReturnValue({ eq: idFilter });
    mockedGetSupabase.mockReturnValue({
      auth: signedInAuth,
      from: jest.fn().mockReturnValue({ update }),
    } as never);

    await expect(removeAccountabilityContact("contact-1")).resolves.toBeUndefined();
    expect(update).toHaveBeenCalledWith({
      deleted: true,
      deleted_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T.*Z$/),
    });
    expect(idFilter).toHaveBeenCalledWith("id", "contact-1");
    expect(ownerFilter).toHaveBeenCalledWith("user_id", "user-1");
    expect(activeFilter).toHaveBeenCalledWith("deleted", false);
  });

  test("propagates Supabase soft-delete errors", async () => {
    const activeFilter = jest.fn().mockResolvedValue({
      error: { message: "Contact delete failed" },
    });
    mockedGetSupabase.mockReturnValue({
      auth: signedInAuth,
      from: jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({ eq: activeFilter }),
          }),
        }),
      }),
    } as never);

    await expect(removeAccountabilityContact("contact-1")).rejects.toThrow(
      "Contact delete failed",
    );
  });

  test("rejects when the user is not signed in", async () => {
    mockedGetSupabase.mockReturnValue({
      auth: signedOutAuth,
      from: jest.fn(),
    } as never);

    await expect(removeAccountabilityContact("contact-1")).rejects.toThrow(
      "You must be signed in to manage accountability contacts.",
    );
  });
});
