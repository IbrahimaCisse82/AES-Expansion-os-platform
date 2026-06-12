/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as invitationResend } from './invitation-resend.tsx'
import { template as invitation } from './invitation.tsx'
import { template as kpiAlert } from './kpi-alert.tsx'
import { template as kpiRecurringAlert } from './kpi-recurring-alert.tsx'
import { template as taskAssigned } from './task-assigned.tsx'
import { template as taskOverdue } from './task-overdue.tsx'
import { template as riskAlert } from './risk-alert.tsx'
import { template as mentionNotification } from './mention-notification.tsx'
import { template as budgetWorkflow } from './budget-workflow.tsx'
import { template as notification } from './notification.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'invitation-resend': invitationResend,
  'invitation': invitation,
  'kpi-alert': kpiAlert,
  'kpi-recurring-alert': kpiRecurringAlert,
  'task-assigned': taskAssigned,
  'task-overdue': taskOverdue,
  'risk-alert': riskAlert,
  'mention-notification': mentionNotification,
  'budget-workflow': budgetWorkflow,
  'notification': notification,
}
