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
    const from = jest.fn().mockReturnValue({ select });
    mockedGetSupabase.mockReturnValue({
      auth: signedInAuth,
      from,
    } as never);

    await expect(fetchAccountabilityContacts()).resolves.toEqual(contacts);
    expect(from).toHaveBeenCalledWith("accountability_contacts");
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

  test("propagates authentication provider errors", async () => {
    mockedGetSupabase.mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: { message: "Authentication provider unavailable" },
        }),
      },
      from: jest.fn(),
    } as never);

    await expect(fetchAccountabilityContacts()).rejects.toThrow(
      "Authentication provider unavailable",
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
    const from = jest.fn().mockReturnValue({ insert });
    mockedGetSupabase.mockReturnValue({
      auth: signedInAuth,
      from,
    } as never);

    await expect(
      createAccountabilityContact({
        name: "Jamie Rivera",
        phone: "(555) 123-4567",
        email: "jamie@example.com",
        relationship: "friend",
      }),
    ).resolves.toEqual(created);
    expect(from).toHaveBeenCalledWith("accountability_contacts");
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
    const maybeSingle = jest.fn().mockResolvedValue({
      data: { id: "contact-1" },
      error: null,
    });
    const select = jest.fn().mockReturnValue({ maybeSingle });
    const activeFilter = jest.fn().mockReturnValue({ select });
    const ownerFilter = jest.fn().mockReturnValue({ eq: activeFilter });
    const idFilter = jest.fn().mockReturnValue({ eq: ownerFilter });
    const update = jest.fn().mockReturnValue({ eq: idFilter });
    const from = jest.fn().mockReturnValue({ update });
    mockedGetSupabase.mockReturnValue({
      auth: signedInAuth,
      from,
    } as never);

    await expect(removeAccountabilityContact("contact-1")).resolves.toBeUndefined();
    expect(from).toHaveBeenCalledWith("accountability_contacts");
    expect(update).toHaveBeenCalledWith({
      deleted: true,
      deleted_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T.*Z$/),
    });
    expect(idFilter).toHaveBeenCalledWith("id", "contact-1");
    expect(ownerFilter).toHaveBeenCalledWith("user_id", "user-1");
    expect(activeFilter).toHaveBeenCalledWith("deleted", false);
    expect(select).toHaveBeenCalledWith("id");
    expect(maybeSingle).toHaveBeenCalledTimes(1);
  });

  test("propagates Supabase soft-delete errors", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({
      data: null,
      error: { message: "Contact delete failed" },
    });
    const select = jest.fn().mockReturnValue({ maybeSingle });
    const activeFilter = jest.fn().mockReturnValue({ select });
    const ownerFilter = jest.fn().mockReturnValue({ eq: activeFilter });
    const idFilter = jest.fn().mockReturnValue({ eq: ownerFilter });
    mockedGetSupabase.mockReturnValue({
      auth: signedInAuth,
      from: jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue({ eq: idFilter }),
      }),
    } as never);

    await expect(removeAccountabilityContact("contact-1")).rejects.toThrow(
      "Contact delete failed",
    );
    expect(idFilter).toHaveBeenCalledWith("id", "contact-1");
    expect(ownerFilter).toHaveBeenCalledWith("user_id", "user-1");
    expect(activeFilter).toHaveBeenCalledWith("deleted", false);
  });

  test("rejects when no active owned row was updated", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({
      data: null,
      error: null,
    });
    const select = jest.fn().mockReturnValue({ maybeSingle });
    const activeFilter = jest.fn().mockReturnValue({ select });
    const ownerFilter = jest.fn().mockReturnValue({ eq: activeFilter });
    const idFilter = jest.fn().mockReturnValue({ eq: ownerFilter });
    mockedGetSupabase.mockReturnValue({
      auth: signedInAuth,
      from: jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue({ eq: idFilter }),
      }),
    } as never);

    await expect(removeAccountabilityContact("missing")).rejects.toThrow(
      "Accountability contact was not found or is no longer active.",
    );
    expect(idFilter).toHaveBeenCalledWith("id", "missing");
    expect(ownerFilter).toHaveBeenCalledWith("user_id", "user-1");
    expect(activeFilter).toHaveBeenCalledWith("deleted", false);
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
