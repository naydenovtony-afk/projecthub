# Supabase migrations workflow

This folder is the local migration history synced from the project SQL schema files.

## Migrations

- `202602170001_core_schema.sql` - core app schema, RLS, RBAC helper, storage policies
- `202602170002_contacts_and_sharing.sql` - contacts and project sharing
- `202602170003_team_chat.sql` - team chat rooms/messages
- `202602170004_messages_legacy.sql` - legacy direct messaging schema

## Recommended workflow

1. Link project:
   - `supabase link --project-ref <your-project-ref>`
2. Pull current remote schema into diffable migration (optional baseline check):
   - `supabase db pull`
3. Create new migration for each schema change:
   - `supabase migration new <change_name>`
4. Edit migration SQL in `supabase/migrations`.
5. Apply locally/remote:
   - `supabase db push`

Avoid editing production schema directly in the dashboard without a matching migration file.
