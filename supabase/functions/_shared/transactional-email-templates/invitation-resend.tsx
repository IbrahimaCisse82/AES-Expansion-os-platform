/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'ExpansionOS'

interface InvitationResendProps {
  fullName?: string
  email?: string
  temporaryPassword?: string
}

const InvitationResendEmail = ({ fullName, email, temporaryPassword }: InvitationResendProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Votre invitation à rejoindre {SITE_NAME} a été relancée</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>{SITE_NAME}</Text>
        <Heading style={h1}>
          {fullName ? `Bonjour ${fullName},` : 'Bonjour,'}
        </Heading>
        <Text style={text}>
          Votre invitation à rejoindre la plateforme <strong>{SITE_NAME}</strong> a été relancée. Veuillez utiliser les identifiants ci-dessous pour vous connecter :
        </Text>
        <Section style={credentialsBox}>
          <Text style={credentialLabel}>Email</Text>
          <Text style={credentialValue}>{email || '—'}</Text>
          <Text style={credentialLabel}>Mot de passe temporaire</Text>
          <Text style={credentialValue}>{temporaryPassword || '—'}</Text>
        </Section>
        <Text style={text}>
          Vous devrez changer ce mot de passe lors de votre première connexion.
        </Text>
        <Text style={footer}>
          Si vous n'attendiez pas cette invitation, vous pouvez ignorer cet email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: InvitationResendEmail,
  subject: 'Votre invitation ExpansionOS a été relancée',
  displayName: 'Relance d\'invitation',
  previewData: {
    fullName: 'Jean Dupont',
    email: 'jean@example.com',
    temporaryPassword: 'TempAbc123!',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '32px 28px' }
const brand = { fontSize: '14px', fontWeight: 'bold' as const, color: 'hsl(210, 36%, 17%)', letterSpacing: '0.5px', margin: '0 0 24px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(210, 36%, 17%)', margin: '0 0 20px' }
const text = { fontSize: '14px', color: 'hsl(231, 13%, 60%)', lineHeight: '1.6', margin: '0 0 20px' }
const credentialsBox = {
  backgroundColor: 'hsl(36, 33%, 97%)',
  borderRadius: '14px',
  padding: '20px 24px',
  margin: '0 0 20px',
  border: '1px solid hsl(32, 20%, 88%)',
}
const credentialLabel = { fontSize: '11px', color: 'hsl(231, 13%, 60%)', textTransform: 'uppercase' as const, letterSpacing: '0.5px', margin: '0 0 4px', fontWeight: '600' as const }
const credentialValue = { fontSize: '15px', color: 'hsl(210, 36%, 17%)', fontWeight: 'bold' as const, margin: '0 0 16px' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
