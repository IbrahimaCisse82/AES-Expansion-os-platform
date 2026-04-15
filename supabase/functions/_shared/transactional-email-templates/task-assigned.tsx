/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'ExpansionOS'

interface TaskAssignedProps {
  taskTitle?: string
  countryName?: string
  priority?: string
  dueDate?: string
  assignedBy?: string
}

const TaskAssignedEmail = ({ taskTitle, countryName, priority, dueDate, assignedBy }: TaskAssignedProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>📋 Nouvelle tâche assignée : {taskTitle || 'Tâche'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>{SITE_NAME}</Text>
        <Heading style={h1}>📋 Tâche assignée</Heading>
        <Text style={text}>
          {assignedBy ? `${assignedBy} vous a assigné` : 'Une nouvelle tâche vous a été assignée'} sur {SITE_NAME}.
        </Text>
        <Section style={infoBox}>
          <Text style={infoLabel}>Tâche</Text>
          <Text style={infoValue}>{taskTitle || '—'}</Text>
          <Text style={infoLabel}>Marché</Text>
          <Text style={infoValue}>{countryName || '—'}</Text>
          <Text style={infoLabel}>Priorité</Text>
          <Text style={infoValue}>{priority || '—'}</Text>
          {dueDate && (
            <>
              <Text style={infoLabel}>Échéance</Text>
              <Text style={infoValue}>{dueDate}</Text>
            </>
          )}
        </Section>
        <Text style={text}>Connectez-vous à {SITE_NAME} pour voir les détails.</Text>
        <Text style={footer}>Notification automatique · {SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: TaskAssignedEmail,
  subject: (data: Record<string, any>) => `📋 Tâche assignée : ${data.taskTitle || 'Nouvelle tâche'}`,
  displayName: 'Tâche assignée',
  previewData: { taskTitle: 'Préparer rapport Q1', countryName: '🇸🇳 Sénégal', priority: 'Haute', dueDate: '15 avril 2026', assignedBy: 'Jean Dupont' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '32px 28px' }
const brand = { fontSize: '14px', fontWeight: 'bold' as const, color: 'hsl(210, 36%, 17%)', letterSpacing: '0.5px', margin: '0 0 24px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(210, 36%, 17%)', margin: '0 0 20px' }
const text = { fontSize: '14px', color: 'hsl(231, 13%, 60%)', lineHeight: '1.6', margin: '0 0 20px' }
const infoBox = { backgroundColor: 'hsl(36, 33%, 97%)', borderRadius: '14px', padding: '20px 24px', margin: '0 0 20px', border: '1px solid hsl(32, 20%, 88%)' }
const infoLabel = { fontSize: '11px', color: 'hsl(231, 13%, 60%)', textTransform: 'uppercase' as const, letterSpacing: '0.5px', margin: '0 0 4px', fontWeight: '600' as const }
const infoValue = { fontSize: '15px', color: 'hsl(210, 36%, 17%)', fontWeight: 'bold' as const, margin: '0 0 16px' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
