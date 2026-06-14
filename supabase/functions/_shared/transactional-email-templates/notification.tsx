/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'ExpansionOS'
const APP_URL = 'https://expansion-os.online'

interface NotificationProps {
  title?: string
  message?: string
  link?: string
  type?: string
}

const NotificationEmail = ({ title, message, link }: NotificationProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>{title || 'Nouvelle notification ExpansionOS'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>{SITE_NAME}</Text>
        <Heading style={h1}>{title || 'Nouvelle notification'}</Heading>
        {message && (
          <Section style={infoBox}>
            <Text style={infoValue}>{message}</Text>
          </Section>
        )}
        {link && (
          <Section style={{ textAlign: 'center' as const, margin: '24px 0' }}>
            <Button href={`${APP_URL}${link}`} style={button}>Ouvrir dans ExpansionOS</Button>
          </Section>
        )}
        <Text style={footer}>
          Notification automatique · {SITE_NAME}
          <br />
          Vous pouvez désactiver ce type d'email dans Paramètres → Notifications.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: NotificationEmail,
  subject: (data: Record<string, unknown>) => (data.title as string) || 'Notification ExpansionOS',
  displayName: 'Notification générique',
  previewData: {
    title: '⏰ Jalon dans 7 jours',
    message: '🇸🇳 Sénégal — « Lancement commercial » est attendu le 2026-06-19',
    link: '/pays/sn',
    type: 'milestone_j7',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '560px' }
const brand = { fontSize: '14px', fontWeight: 'bold' as const, color: 'hsl(210, 36%, 17%)', letterSpacing: '0.5px', margin: '0 0 24px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(210, 36%, 17%)', margin: '0 0 20px' }
const infoBox = { backgroundColor: 'hsl(36, 33%, 97%)', borderRadius: '14px', padding: '20px 24px', margin: '0 0 20px', border: '1px solid hsl(32, 20%, 88%)' }
const infoValue = { fontSize: '15px', color: 'hsl(210, 36%, 17%)', margin: 0, lineHeight: '1.6' }
const button = { backgroundColor: 'hsl(210, 36%, 17%)', color: '#ffffff', padding: '12px 28px', borderRadius: '10px', textDecoration: 'none', fontSize: '14px', fontWeight: 'bold' as const }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0', lineHeight: '1.5' }