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
  rejected: 'Rejeté',
  locked: 'Verrouillé',
  draft: 'Repassé en brouillon',
}

interface BudgetWorkflowProps {
  scenarioName?: string
  newStatus?: string
  changedBy?: string
  rejectionReason?: string
}

const BudgetWorkflowEmail = ({ scenarioName, newStatus, changedBy, rejectionReason }: BudgetWorkflowProps) => {
  const statusText = STATUS_LABELS[newStatus || ''] || newStatus || '—'
  const isRejected = newStatus === 'rejected'
  return (
    <Html lang="fr" dir="ltr">
      <Head />
      <Preview>💰 Budget "{scenarioName || 'Scénario'}" — {statusText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={brand}>{SITE_NAME}</Text>
          <Heading style={h1}>{isRejected ? '❌ Scénario budgétaire rejeté' : '💰 Mise à jour budget'}</Heading>
          <Text style={text}>
            {isRejected
              ? `Votre scénario budgétaire a été rejeté${changedBy ? ` par ${changedBy}` : ''}. Vous pouvez le reprendre en brouillon après lecture du motif ci-dessous.`
              : `Le statut du scénario budgétaire a été modifié${changedBy ? ` par ${changedBy}` : ''}.`}
          </Text>
          <Section style={infoBox}>
            <Text style={infoLabel}>Scénario</Text>
            <Text style={infoValue}>{scenarioName || '—'}</Text>
            <Text style={infoLabel}>Nouveau statut</Text>
            <Text style={infoValue}>{statusText}</Text>
            {isRejected && rejectionReason && (
              <>
                <Text style={infoLabel}>Motif du rejet</Text>
                <Text style={rejectionBlock}>« {rejectionReason} »</Text>
              </>
            )}
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
  subject: (data: Record<string, unknown>) => {
    const status = STATUS_LABELS[String(data.newStatus ?? '')] || data.newStatus || 'Mis à jour'
    const emoji = data.newStatus === 'rejected' ? '❌' : '💰'
    return `${emoji} Budget "${data.scenarioName || 'Scénario'}" — ${status}`
  },
  displayName: 'Workflow budget',
  previewData: { scenarioName: 'Budget 2026 — Baseline', newStatus: 'rejected', changedBy: 'Jean Dupont', rejectionReason: 'Les hypothèses de revenus sur la Côte d\'Ivoire sont trop optimistes — revoir avec le pays.' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '32px 28px' }
const brand = { fontSize: '14px', fontWeight: 'bold' as const, color: 'hsl(210, 36%, 17%)', letterSpacing: '0.5px', margin: '0 0 24px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(210, 36%, 17%)', margin: '0 0 20px' }
const text = { fontSize: '14px', color: 'hsl(231, 13%, 60%)', lineHeight: '1.6', margin: '0 0 20px' }
const infoBox = { backgroundColor: 'hsl(36, 33%, 97%)', borderRadius: '14px', padding: '20px 24px', margin: '0 0 20px', border: '1px solid hsl(32, 20%, 88%)' }
const infoLabel = { fontSize: '11px', color: 'hsl(231, 13%, 60%)', textTransform: 'uppercase' as const, letterSpacing: '0.5px', margin: '0 0 4px', fontWeight: '600' as const }
const infoValue = { fontSize: '15px', color: 'hsl(210, 36%, 17%)', fontWeight: 'bold' as const, margin: '0 0 16px' }
const rejectionBlock = { fontSize: '14px', color: 'hsl(15, 52%, 43%)', fontStyle: 'italic' as const, lineHeight: '1.5', margin: '0 0 8px', padding: '12px 14px', backgroundColor: 'hsl(15, 60%, 96%)', borderLeft: '3px solid hsl(15, 52%, 53%)', borderRadius: '6px' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
