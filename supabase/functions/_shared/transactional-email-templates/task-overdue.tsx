/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'ExpansionOS'

interface TaskOverdueProps {
  taskTitle?: string
  countryName?: string
  dueDate?: string
  assigneeName?: string
}

const TaskOverdueEmail = ({ taskTitle, countryName, dueDate, assigneeName }: TaskOverdueProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>🔴 Tâche en retard : {taskTitle || 'Tâche'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>{SITE_NAME}</Text>
        <Heading style={h1}>🔴 Tâche en retard</Heading>
        <Text style={text}>
          Une tâche {assigneeName ? `assignée à ${assigneeName}` : ''} a dépassé son échéance.
        </Text>
        <Section style={alertBox}>
          <Text style={alertLabel}>Tâche</Text>
          <Text style={alertValue}>{taskTitle || '—'}</Text>
          <Text style={alertLabel}>Marché</Text>
          <Text style={alertValue}>{countryName || '—'}</Text>
          <Text style={alertLabel}>Échéance dépassée</Text>
          <Text style={{...alertValue, color: '#dc2626'}}>{dueDate || '—'}</Text>
        </Section>
        <Text style={text}>Connectez-vous à {SITE_NAME} pour mettre à jour le statut.</Text>
        <Text style={footer}>Notification automatique · {SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: TaskOverdueEmail,
  subject: (data: Record<string, any>) => `🔴 Tâche en retard : ${data.taskTitle || 'Tâche'}`,
  displayName: 'Tâche en retard',
  previewData: { taskTitle: 'Audit financier', countryName: '🇧🇯 Bénin', dueDate: '10 avril 2026', assigneeName: 'Marie Koffi' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '32px 28px' }
const brand = { fontSize: '14px', fontWeight: 'bold' as const, color: 'hsl(210, 36%, 17%)', letterSpacing: '0.5px', margin: '0 0 24px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(210, 36%, 17%)', margin: '0 0 20px' }
const text = { fontSize: '14px', color: 'hsl(231, 13%, 60%)', lineHeight: '1.6', margin: '0 0 20px' }
const alertBox = { backgroundColor: '#fef2f2', borderRadius: '14px', padding: '20px 24px', margin: '0 0 20px', border: '1px solid #fecaca' }
const alertLabel = { fontSize: '11px', color: 'hsl(231, 13%, 60%)', textTransform: 'uppercase' as const, letterSpacing: '0.5px', margin: '0 0 4px', fontWeight: '600' as const }
const alertValue = { fontSize: '15px', color: 'hsl(210, 36%, 17%)', fontWeight: 'bold' as const, margin: '0 0 16px' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
