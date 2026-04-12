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

interface InvitationProps {
  fullName?: string
  email?: string
  temporaryPassword?: string
  roleName?: string
}

const InvitationEmail = ({ fullName, email, temporaryPassword, roleName }: InvitationProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Bienvenue sur {SITE_NAME} — vos identifiants de connexion</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>{SITE_NAME}</Text>
        <Heading style={h1}>
          {fullName ? `Bienvenue ${fullName} !` : 'Bienvenue !'}
        </Heading>
        <Text style={text}>
          Vous avez été invité à rejoindre la plateforme <strong>{SITE_NAME}</strong>
          {roleName ? ` en tant que <strong>${roleName}</strong>` : ''}.
          Voici vos identifiants de connexion :
        </Text>
        <Section style={credentialsBox}>
          <Text style={credentialLabel}>Email</Text>
          <Text style={credentialValue}>{email || '—'}</Text>
          <Text style={credentialLabel}>Mot de passe temporaire</Text>
          <Text style={credentialValue}>{temporaryPassword || '—'}</Text>
        </Section>
        <Text style={text}>
          Nous vous recommandons de changer votre mot de passe lors de votre première connexion pour des raisons de sécurité.
        </Text>
        <Text style={footer}>
          Si vous n'attendiez pas cette invitation, vous pouvez ignorer cet email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: InvitationEmail,
  subject: 'Bienvenue sur ExpansionOS — vos identifiants',
  displayName: 'Invitation initiale',
  previewData: {
    fullName: 'Jean Dupont',
    email: 'jean@example.com',
    temporaryPassword: 'TempAbc123!',
    roleName: 'Analyste',
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
