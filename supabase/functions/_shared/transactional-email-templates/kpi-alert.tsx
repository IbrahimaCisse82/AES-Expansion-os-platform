/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'ExpansionOS'

interface KpiAlertProps {
  countryName?: string
  month?: string
  metric?: string
  actual?: string
  target?: string
  percentage?: string
}

const KpiAlertEmail = ({ countryName, month, metric, actual, target, percentage }: KpiAlertProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>⚠️ Alerte KPI — {metric || 'Indicateur'} sous le seuil pour {countryName || 'un marché'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>{SITE_NAME}</Text>
        <Heading style={h1}>⚠️ Alerte KPI</Heading>
        <Text style={text}>
          Un indicateur de performance est tombé sous le seuil d'alerte pour <strong>{countryName || '—'}</strong> ({month || '—'}).
        </Text>
        <Section style={alertBox}>
          <Text style={alertLabel}>Indicateur</Text>
          <Text style={alertValue}>{metric || '—'}</Text>
          <Text style={alertLabel}>Réalisé</Text>
          <Text style={alertValue}>{actual || '—'}</Text>
          <Text style={alertLabel}>Objectif</Text>
          <Text style={alertValue}>{target || '—'}</Text>
          <Text style={alertLabel}>Atteinte</Text>
          <Text style={{...alertValue, color: '#dc2626'}}>{percentage || '—'}%</Text>
        </Section>
        <Text style={text}>
          Connectez-vous à {SITE_NAME} pour analyser la situation et prendre les mesures correctives nécessaires.
        </Text>
        <Text style={footer}>Notification automatique · {SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: KpiAlertEmail,
  subject: (data: Record<string, any>) => `⚠️ Alerte KPI — ${data.metric || 'Indicateur'} sous le seuil (${data.countryName || ''})`,
  displayName: 'Alerte KPI sous seuil',
  previewData: { countryName: 'Sénégal', month: '2026-04', metric: 'CA Mensuel', actual: '450 000 FCFA', target: '1 000 000 FCFA', percentage: '45' },
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
