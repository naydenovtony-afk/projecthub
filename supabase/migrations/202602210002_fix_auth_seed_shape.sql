-- Repair seeded auth rows so GoTrue can resolve email/password users correctly.

DO $$
DECLARE
    v_instance_id uuid;
BEGIN
    SELECT id INTO v_instance_id
    FROM auth.instances
    LIMIT 1;

    IF v_instance_id IS NULL THEN
        RAISE NOTICE 'No auth.instances row found; skipping auth seed shape fix.';
        RETURN;
    END IF;

    -- Ensure users belong to the active auth instance
    UPDATE auth.users
    SET
        instance_id = v_instance_id,
        aud = 'authenticated',
        role = 'authenticated',
        email_confirmed_at = COALESCE(email_confirmed_at, now()),
        updated_at = now()
    WHERE email IN ('admin@projecthub.com', 'demo@projecthub.com');

    -- Update existing identities for seeded users
    UPDATE auth.identities i
    SET
        provider = 'email',
        provider_id = u.email,
        identity_data = COALESCE(i.identity_data, '{}'::jsonb)
          || jsonb_build_object(
              'sub', u.id::text,
              'email', u.email,
              'email_verified', true,
              'phone_verified', false
             ),
        updated_at = now()
    FROM auth.users u
    WHERE i.user_id = u.id
      AND u.email IN ('admin@projecthub.com', 'demo@projecthub.com');

    -- Insert missing identities if absent
    INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        provider_id,
        last_sign_in_at,
        created_at,
        updated_at
    )
    SELECT
        gen_random_uuid(),
        u.id,
        jsonb_build_object(
            'sub', u.id::text,
            'email', u.email,
            'email_verified', true,
            'phone_verified', false
        ),
        'email',
        u.email,
        now(),
        now(),
        now()
    FROM auth.users u
    WHERE u.email IN ('admin@projecthub.com', 'demo@projecthub.com')
      AND NOT EXISTS (
          SELECT 1
          FROM auth.identities i
          WHERE i.user_id = u.id
            AND i.provider = 'email'
      );

    RAISE NOTICE 'Auth seed shape fix applied.';
END $$;
