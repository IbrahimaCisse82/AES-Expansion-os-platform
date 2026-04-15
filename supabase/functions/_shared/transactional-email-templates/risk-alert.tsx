/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'ExpansionOS'

interface RiskAlertProps {
  riskTitle?: string
  level?: string
  countryName?: string
  description?: string
  category?: string
}

const RiskAlertEmail = ({ riskTitle, level, countryName, description, category }: RiskAlertProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>⚠️ Nouveau risque élevé : {riskTitle || 'Risque'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>{SITE_NAME}</Text>
        <Heading style={h1}>⚠️ Nouveau risque signalé</Heading>
        <Text style={text}>
          Un risque de niveau <strong>{level || 'élevé'}</strong> a été créé sur {SITE_NAME}.
        </Text>
        <Section style={alertBox}>
          <Text style={alertLabel}>Risque</Text>
          <Text style={alertValue}>{riskTitle || '—'}</Text>
          <Text style={alertLabel}>Niveau</Text>
          <Text style={alertValue}>{level || '—'}</Text>
          <Text style={alertLabel}>Marché</Text>
          <Text style={alertValue}>{countryName || '—'}</Text>
          {category && (
            <>
              <Text style={alertLabel}>Catégorie</Text>
              <Text style={alertValue}>{category}</Text>
            </>
          )}
          {description && (
            <>
              <Text style={alertLabel}>Description</Text>
              <Text style={{...alertValue, fontWeight: 'normal' as const, fontSize: '13px'}}>{description}</Text>
            </>
          )}
        </Section>
        <Text style={text}>Connectez-vous à {SITE_NAME} pour consulter et définir les mesures d'atténuation.</Text>
        <Text style={footer}>Notification automatique · {SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: RiskAlertEmail,
  subject: (data: Record<string, any>) => `⚠️ Risque ${data.level || 'élevé'} : ${data.riskTitle || 'Nouveau risque'}`,
  displayName: 'Alerte risque élevé',
  previewData: { riskTitle: 'Instabilité réglementaire', level: 'Élevé', countryName: '🇨🇮 Côte d\'Ivoire', description: 'Changements réglementaires imprévus', category: 'Réglementaire' },
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
