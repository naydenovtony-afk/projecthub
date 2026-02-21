-- Remove the broken seeded admin auth user so it can be recreated through normal Auth signup flow.

DO $$
DECLARE
    v_admin_id uuid;
BEGIN
    SELECT id INTO v_admin_id
    FROM auth.users
    WHERE email = 'admin@projecthub.com'
    LIMIT 1;

    IF v_admin_id IS NULL THEN
        RAISE NOTICE 'Admin user not found, nothing to cleanup.';
        RETURN;
    END IF;

    DELETE FROM auth.identities
    WHERE user_id = v_admin_id;

    -- This cascades to public.profiles (FK profiles.id -> auth.users.id),
    -- then to user_roles via profiles FK.
    DELETE FROM auth.users
    WHERE id = v_admin_id;

    RAISE NOTICE 'Removed broken admin auth user. Recreate via signup flow.';
END $$;
