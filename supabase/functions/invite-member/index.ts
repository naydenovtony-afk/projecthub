import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { project_id, email, role, message, invited_by } = await req.json();

    // Validate required fields
    if (!project_id || !email || !role || !invited_by) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: project_id, email, role, invited_by' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email address' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate role
    const validRoles = ['project_manager', 'project_coordinator', 'team_member'];
    if (!validRoles.includes(role)) {
      return new Response(
        JSON.stringify({ error: 'Invalid role' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Admin Supabase client — bypasses RLS for privacy-safe lookup
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 1. Privacy-safe: check if email exists in profiles (no data leakage to client)
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (existingUser) {
      // ── User EXISTS in the system ──

      // Check if already a member
      const { data: existingMember } = await supabase
        .from('project_members')
        .select('id')
        .eq('project_id', project_id)
        .eq('user_id', existingUser.id)
        .maybeSingle();

      if (existingMember) {
        return new Response(
          JSON.stringify({ status: 'already_member' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Add directly to project_members
      const { error: insertError } = await supabase
        .from('project_members')
        .insert({ project_id, user_id: existingUser.id, role, invited_by });

      if (insertError) throw insertError;

      // Get project title for notification
      const { data: project } = await supabase
        .from('projects')
        .select('title')
        .eq('id', project_id)
        .single();

      // Send in-app notification
      await supabase.from('notifications').insert({
        user_id: existingUser.id,
        project_id,
        notification_type: 'project_invitation',
        title: 'Added to Project',
        message: `You've been added to "${project?.title ?? 'a project'}" as ${role.replace(/_/g, ' ')}`,
        entity_type: 'project',
        entity_id: project_id,
        is_read: false
      });

      return new Response(
        JSON.stringify({ status: 'added', user_id: existingUser.id }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      // ── User does NOT exist — create pending invitation ──

      // Check if a pending invitation already exists for this email + project
      const { data: existingInvite } = await supabase
        .from('project_invitations')
        .select('id')
        .eq('project_id', project_id)
        .eq('email', email.toLowerCase())
        .eq('status', 'pending')
        .maybeSingle();

      if (existingInvite) {
        // Reset expiry and return
        const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        await supabase
          .from('project_invitations')
          .update({ expires_at: newExpiry })
          .eq('id', existingInvite.id);

        return new Response(
          JSON.stringify({ status: 'invited', resent: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const { data: invitation, error: inviteError } = await supabase
        .from('project_invitations')
        .insert({
          project_id,
          email: email.toLowerCase(),
          role,
          message: message || null,
          invited_by,
          expires_at: expiresAt
        })
        .select('token')
        .single();

      if (inviteError) throw inviteError;

      // TODO: Send email via Resend API
      // const siteUrl = Deno.env.get('SITE_URL') ?? 'https://tranquil-gumdrop-ec5603.netlify.app';
      // const inviteLink = `${siteUrl}/pages/register.html?invite=${invitation.token}`;
      // await sendInviteEmail(email, inviteLink, message);

      return new Response(
        JSON.stringify({ status: 'invited', token: invitation?.token }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('invite-member error:', error);
    return new Response(
      JSON.stringify({ error: error.message ?? 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
