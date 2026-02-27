/**
 * Audit Log Widget
 * Renders a project's audit trail.
 * Only visible to Project Manager and Project Coordinator (enforced by RLS + JS).
 *
 * Usage:
 *   import { AuditLogWidget } from '../scripts/components/AuditLogWidget.js';
 *   const widget = new AuditLogWidget('auditLogContainer', projectId);
 *   await widget.load();
 */

import { getProjectAuditLog } from '../../services/taskService.js';
import { getUserProjectRole, hasPermission, formatRole, formatStatus } from '../../services/projectPermissions.js';

export class AuditLogWidget {
  /**
   * @param {string} containerId - DOM element id to render into
   * @param {string} projectId   - Project UUID
   * @param {number} [limit=30]  - How many entries to show
   */
  constructor(containerId, projectId, limit = 30) {
    this.container = document.getElementById(containerId);
    this.projectId = projectId;
    this.limit = limit;
  }

  /**
   * Load and render the audit log.
   * Silently hides the container if the user lacks permission.
   */
  async load() {
    if (!this.container) return;

    // Permission gate (RLS is the real guard; this just hides UI for non-PM/PC)
    const role = await getUserProjectRole(this.projectId);
    if (!hasPermission(role, 'view_audit_log')) {
      this.container.style.display = 'none';
      return;
    }

    this.container.style.display = '';
    this._renderSkeleton();

    const entries = await getProjectAuditLog(this.projectId, this.limit);
    this._render(entries);
  }

  // ─── Private ───────────────────────────────────────────────────────────────

  _renderSkeleton() {
    this.container.innerHTML = `
      <div class="card shadow-sm">
        <div class="card-header d-flex align-items-center gap-2">
          <i class="bi bi-journal-text text-muted"></i>
          <strong>Activity Log</strong>
        </div>
        <div class="card-body text-center py-4">
          <div class="spinner-border spinner-border-sm text-primary"></div>
          <p class="text-muted mt-2 mb-0 small">Loading activity…</p>
        </div>
      </div>
    `;
  }

  _render(entries) {
    if (!entries.length) {
      this.container.innerHTML = `
        <div class="card shadow-sm">
          <div class="card-header d-flex align-items-center gap-2">
            <i class="bi bi-journal-text text-muted"></i>
            <strong>Activity Log</strong>
          </div>
          <div class="card-body text-center py-4 text-muted">
            <i class="bi bi-journal-x" style="font-size:2rem;"></i>
            <p class="mt-2 mb-0">No activity recorded yet.</p>
          </div>
        </div>
      `;
      return;
    }

    const rows = entries.map(e => this._renderEntry(e)).join('');

    this.container.innerHTML = `
      <div class="card shadow-sm">
        <div class="card-header d-flex align-items-center justify-content-between">
          <div class="d-flex align-items-center gap-2">
            <i class="bi bi-journal-text text-muted"></i>
            <strong>Activity Log</strong>
          </div>
          <span class="badge bg-secondary">${entries.length} events</span>
        </div>
        <div class="list-group list-group-flush audit-log-list" style="max-height:420px;overflow-y:auto;">
          ${rows}
        </div>
      </div>
    `;
  }

  _renderEntry(entry) {
    const actor = entry.actor;
    const actorName = actor?.full_name ?? 'Unknown user';
    const initials = actorName.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
    const time = this._formatTime(entry.created_at);
    const { icon, label, detail } = this._describeAction(entry);

    return `
      <div class="list-group-item px-3 py-2">
        <div class="d-flex align-items-center gap-3">
          <div class="rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center flex-shrink-0"
               style="width:32px;height:32px;font-size:0.75rem;font-weight:700;">
            ${initials}
          </div>
          <div class="flex-grow-1 min-w-0">
            <div class="d-flex align-items-center gap-2 flex-wrap">
              <span class="fw-medium">${this._escapeHtml(actorName)}</span>
              <span class="badge bg-light text-dark border">
                <i class="bi ${icon} me-1"></i>${label}
              </span>
              ${detail ? `<span class="text-muted small">${detail}</span>` : ''}
            </div>
          </div>
          <span class="text-muted small flex-shrink-0" title="${new Date(entry.created_at).toLocaleString()}">
            ${time}
          </span>
        </div>
      </div>
    `;
  }

  _describeAction(entry) {
    const { action, old_value, new_value } = entry;

    switch (action) {
      case 'task_status_changed': {
        const from = formatStatus(old_value?.status ?? '?');
        const to   = formatStatus(new_value?.status ?? '?');
        return {
          icon:   'bi-arrow-left-right',
          label:  'changed task status',
          detail: `${from} → <strong>${to}</strong>`,
        };
      }
      case 'task_completed':
        return { icon: 'bi-check-circle-fill text-success', label: 'completed task', detail: null };

      case 'member_added': {
        const role = formatRole(new_value?.role);
        return { icon: 'bi-person-plus', label: 'added member', detail: `as ${role}` };
      }
      case 'member_removed':
        return { icon: 'bi-person-dash text-danger', label: 'removed member', detail: null };

      case 'role_changed': {
        const from = formatRole(old_value?.role);
        const to   = formatRole(new_value?.role);
        return {
          icon:   'bi-person-gear',
          label:  'changed role',
          detail: `${from} → <strong>${to}</strong>`,
        };
      }
      case 'pm_delegation':
        return { icon: 'bi-shield-check text-warning', label: 'delegated PM rights', detail: null };

      case 'pm_delegation_revoked':
        return { icon: 'bi-shield-x text-secondary', label: 'revoked PM delegation', detail: null };

      default:
        return { icon: 'bi-activity', label: action.replace(/_/g, ' '), detail: null };
    }
  }

  _formatTime(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now  = new Date();
    const diff = now - date; // ms

    if (diff < 60_000)      return 'just now';
    if (diff < 3_600_000)   return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000)  return `${Math.floor(diff / 3_600_000)}h ago`;
    if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d ago`;

    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  _escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}
