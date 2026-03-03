import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Send a project invitation email via Resend API.
 * Non-critical: logs a warning on failure instead of throwing.
 */
async function sendInviteEmail(
  email: string,
  token: string | undefined,
  projectTitle: string,
  role: string,
  message?: string | null
): Promise<void> {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) {
    console.warn('RESEND_API_KEY not set — invitation email not sent');
    return;
  }

  const siteUrl = Deno.env.get('SITE_URL') ?? 'https://tranquil-gumdrop-ec5603.netlify.app';
  const inviteLink = token
    ? `${siteUrl}/pages/register.html?invite=${token}`
    : siteUrl;
  const roleLabel = role.replace(/_/g, ' ');

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'ProjectHub <noreply@projecthub.app>',
        to: [email],
        subject: `You've been invited to join "${projectTitle}" on ProjectHub`,
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:auto">
            <h2 style="color:#0d6efd">Project Invitation</h2>
            <p>You've been invited to join <strong>${projectTitle}</strong> as <strong>${roleLabel}</strong>.</p>
            ${message ? `<blockquote style="border-left:3px solid #dee2e6;padding-left:12px;color:#555">${message}</blockquote>` : ''}
            <p>
              <a href="${inviteLink}"
                 style="display:inline-block;background:#0d6efd;color:#fff;padding:10px 22px;border-radius:6px;text-decoration:none;font-weight:600">
                Accept Invitation
              </a>
            </p>
            <p style="color:#888;font-size:13px">This invitation expires in 7 days. If you already have an account, <a href="${siteUrl}/pages/login.html">sign in</a> instead.</p>
          </div>
        `,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.warn('Resend API error (non-critical):', res.status, body);
    }
  } catch (err) {
    console.warn('sendInviteEmail failed (non-critical):', err);
  }
}

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

    // Security: verify caller is PM/PC on this project, or the project owner
    const [{ data: callerMembership }, { data: projectOwner }] = await Promise.all([
      supabase
        .from('project_members')
        .select('role')
        .eq('project_id', project_id)
        .eq('user_id', invited_by)
        .maybeSingle(),
      supabase
        .from('projects')
        .select('user_id')
        .eq('id', project_id)
        .single()
    ]);

    const isOwner = projectOwner?.user_id === invited_by;
    const callerRole = callerMembership?.role;
    const isPMorPC = callerMembership && ['project_manager', 'project_coordinator'].includes(callerRole!);

    if (!isOwner && !isPMorPC) {
      return new Response(
        JSON.stringify({ error: 'Permission denied: only Project Managers and Coordinators can invite members' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Enforce role assignment restrictions: PC can only assign team_member
    if (!isOwner && callerRole === 'project_coordinator' && role !== 'team_member') {
      return new Response(
        JSON.stringify({ error: 'Permission denied: Project Coordinators can only invite Team Members' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

      // Add directly to project_members (upsert to safely handle duplicate rows)
      const { error: insertError } = await supabase
        .from('project_members')
        .upsert(
          { project_id, user_id: existingUser.id, role, invited_by },
          { onConflict: 'project_id,user_id', ignoreDuplicates: true }
        );

      if (insertError) {
        console.error('project_members upsert error:', insertError);
        throw insertError;
      }

      // Get project title for notification
      const { data: project } = await supabase
        .from('projects')
        .select('title')
        .eq('id', project_id)
        .single();

      // Send in-app notification (non-critical — don't throw if it fails)
      try {
        await supabase.from('notifications').insert({
          user_id: existingUser.id,
          project_id,
          notification_type: 'project_invitation',
          title: 'Added to Project',
          message: `You've been added to "${project?.title ?? 'a project'}" as ${role.replace(/_/g, ' ')}`,
          entity_type: 'project',
          entity_id: project_id,
          read: false
        });
      } catch (notifErr) {
        console.warn('Notification insert failed (non-critical):', notifErr);
      }

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
        // Reset expiry
        const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        const { data: updatedInvite } = await supabase
          .from('project_invitations')
          .update({ expires_at: newExpiry })
          .eq('id', existingInvite.id)
          .select('token')
          .single();

        // Re-send the invitation email
        const { data: projectForResend } = await supabase
          .from('projects')
          .select('title')
          .eq('id', project_id)
          .single();
        await sendInviteEmail(email, updatedInvite?.token, projectForResend?.title ?? 'a project', role, message);

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

      // Get project title for email
      const { data: projectForEmail } = await supabase
        .from('projects')
        .select('title')
        .eq('id', project_id)
        .single();

      // Send invitation email via Resend
      await sendInviteEmail(email, invitation?.token, projectForEmail?.title ?? 'a project', role, message);

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
