/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'ExpansionOS'

interface KpiRecurringAlertProps {
  countryName?: string
  metric?: string
  consecutiveMonths?: string
  months?: string
  threshold?: string
  latestPercentage?: string
}

const KpiRecurringAlertEmail = ({ countryName, metric, consecutiveMonths, months, threshold, latestPercentage }: KpiRecurringAlertProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>🔴 Alerte récurrente — {metric || 'KPI'} sous le seuil depuis {consecutiveMonths || '2'}+ mois pour {countryName || 'un marché'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>{SITE_NAME}</Text>
        <Heading style={h1}>🔴 Alerte KPI Récurrente</Heading>
        <Text style={text}>
          L'indicateur <strong>{metric || '—'}</strong> reste sous le seuil d'alerte ({threshold || '80'}%) depuis <strong>{consecutiveMonths || '2'} mois consécutifs</strong> pour <strong>{countryName || '—'}</strong>.
        </Text>
        <Section style={alertBox}>
          <Text style={alertLabel}>Indicateur</Text>
          <Text style={alertValue}>{metric || '—'}</Text>
          <Text style={alertLabel}>Mois concernés</Text>
          <Text style={alertValue}>{months || '—'}</Text>
          <Text style={alertLabel}>Dernière atteinte</Text>
          <Text style={{...alertValue, color: '#dc2626'}}>{latestPercentage || '—'}%</Text>
          <Text style={alertLabel}>Mois consécutifs sous le seuil</Text>
          <Text style={{...alertValue, color: '#dc2626'}}>{consecutiveMonths || '—'}</Text>
        </Section>
        <Text style={text}>
          Cette situation nécessite une attention immédiate. Connectez-vous à {SITE_NAME} pour analyser les tendances et mettre en place un plan d'action correctif.
        </Text>
        <Text style={footer}>Notification automatique · {SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: KpiRecurringAlertEmail,
  subject: (data: Record<string, unknown>) => `🔴 Alerte récurrente — ${data.metric || 'KPI'} sous le seuil depuis ${data.consecutiveMonths || '2'} mois (${data.countryName || ''})`,
  displayName: 'Alerte KPI récurrente',
  previewData: {
    countryName: 'Sénégal',
    metric: 'CA Mensuel',
    consecutiveMonths: '3',
    months: '2026-02, 2026-03, 2026-04',
    threshold: '80',
    latestPercentage: '42',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '32px 28px' }
const brand = { fontSize: '14px', fontWeight: 'bold' as const, color: 'hsl(210, 36%, 17%)', letterSpacing: '0.5px', margin: '0 0 24px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(210, 36%, 17%)', margin: '0 0 20px' }
const text = { fontSize: '14px', color: 'hsl(231, 13%, 60%)', lineHeight: '1.6', margin: '0 0 20px' }
const alertBox = { backgroundColor: '#fef2f2', borderRadius: '14px', padding: '20px 24px', margin: '0 0 20px', border: '1px solid #fca5a5' }
const alertLabel = { fontSize: '11px', color: 'hsl(231, 13%, 60%)', textTransform: 'uppercase' as const, letterSpacing: '0.5px', margin: '0 0 4px', fontWeight: '600' as const }
const alertValue = { fontSize: '15px', color: 'hsl(210, 36%, 17%)', fontWeight: 'bold' as const, margin: '0 0 16px' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
