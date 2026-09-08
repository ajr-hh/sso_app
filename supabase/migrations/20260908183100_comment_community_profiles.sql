comment on view public.community_profiles is
  'Definer semantics are intentional. The security boundary is the narrow column list (id, display_name) filtered on deleted = false. Do not enable security_invoker without first adding a column-safe alternative.';
