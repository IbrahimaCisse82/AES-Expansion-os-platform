/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'ExpansionOS'

const STATUS_LABELS: Record<string, string> = {
  submitted: 'Soumis pour approbation',
  approved: 'Approuvé',
  locked: 'Verrouillé',
  draft: 'Repassé en brouillon',
}

interface BudgetWorkflowProps {
  scenarioName?: string
  newStatus?: string
  changedBy?: string
}

const BudgetWorkflowEmail = ({ scenarioName, newStatus, changedBy }: BudgetWorkflowProps) => {
  const statusText = STATUS_LABELS[newStatus || ''] || newStatus || '—'
  return (
    <Html lang="fr" dir="ltr">
      <Head />
      <Preview>💰 Budget "{scenarioName || 'Scénario'}" — {statusText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={brand}>{SITE_NAME}</Text>
          <Heading style={h1}>💰 Mise à jour budget</Heading>
          <Text style={text}>
            Le statut du scénario budgétaire a été modifié{changedBy ? ` par ${changedBy}` : ''}.
          </Text>
          <Section style={infoBox}>
            <Text style={infoLabel}>Scénario</Text>
            <Text style={infoValue}>{scenarioName || '—'}</Text>
            <Text style={infoLabel}>Nouveau statut</Text>
            <Text style={infoValue}>{statusText}</Text>
          </Section>
          <Text style={text}>Connectez-vous à {SITE_NAME} pour consulter les détails.</Text>
          <Text style={footer}>Notification automatique · {SITE_NAME}</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: BudgetWorkflowEmail,
  subject: (data: Record<string, any>) => `💰 Budget "${data.scenarioName || 'Scénario'}" — ${STATUS_LABELS[data.newStatus || ''] || data.newStatus || 'Mis à jour'}`,
  displayName: 'Workflow budget',
  previewData: { scenarioName: 'Budget 2026 — Baseline', newStatus: 'submitted', changedBy: 'Jean Dupont' },
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
