import type { RelationshipValue } from "../presentation/accountabilityContacts";
import { getSupabase } from "../lib/supabase";

export type AccountabilityContact = {
  id: string;
  name: string;
  phone: string;
  email: string;
  relationship: RelationshipValue;
};

export type CreateAccountabilityContactInput = Omit<
  AccountabilityContact,
  "id"
>;

async function requireUserId(): Promise<string> {
  const { data, error } = await getSupabase().auth.getUser();

  if (error) {
    throw new Error(error.message);
  }

  if (!data.user) {
    throw new Error(
      "You must be signed in to manage accountability contacts.",
    );
  }

  return data.user.id;
}

export async function fetchAccountabilityContacts(): Promise<
  AccountabilityContact[]
> {
  const userId = await requireUserId();
  const { data, error } = await getSupabase()
    .from("accountability_contacts")
    .select("id, name, phone, email, relationship")
    .eq("user_id", userId)
    .eq("deleted", false)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function createAccountabilityContact(
  input: CreateAccountabilityContactInput,
): Promise<AccountabilityContact> {
  const userId = await requireUserId();
  const { data, error } = await getSupabase()
    .from("accountability_contacts")
    .insert({
      user_id: userId,
      name: input.name,
      phone: input.phone,
      email: input.email,
      relationship: input.relationship,
    })
    .select("id, name, phone, email, relationship")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function removeAccountabilityContact(id: string): Promise<void> {
  const userId = await requireUserId();
  const { error } = await getSupabase()
    .from("accountability_contacts")
    .update({ deleted: true, deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId)
    .eq("deleted", false);

  if (error) {
    throw new Error(error.message);
  }
}
