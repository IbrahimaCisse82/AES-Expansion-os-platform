/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'ExpansionOS'

interface MentionNotificationProps {
  mentionedName?: string
  authorName?: string
  commentExcerpt?: string
  marketName?: string
}

const MentionNotificationEmail = ({ mentionedName, authorName, commentExcerpt, marketName }: MentionNotificationProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>🔔 {authorName || 'Un collègue'} vous a mentionné dans un commentaire</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>{SITE_NAME}</Text>
        <Heading style={h1}>🔔 Vous avez été mentionné(e)</Heading>
        <Text style={text}>
          {mentionedName ? `Bonjour ${mentionedName}, ` : ''}<strong>{authorName || 'Un collègue'}</strong> vous a mentionné dans un commentaire{marketName ? ` sur ${marketName}` : ''}.
        </Text>
        {commentExcerpt && (
          <Section style={quoteBox}>
            <Text style={quoteText}>"{commentExcerpt}"</Text>
          </Section>
        )}
        <Text style={text}>Connectez-vous à {SITE_NAME} pour répondre.</Text>
        <Text style={footer}>Notification automatique · {SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: MentionNotificationEmail,
  subject: (data: Record<string, unknown>) => `🔔 ${data.authorName || 'Un collègue'} vous a mentionné sur ${SITE_NAME}`,
  displayName: 'Notification de mention',
  previewData: { mentionedName: 'Marie', authorName: 'Jean Dupont', commentExcerpt: 'Peux-tu vérifier les chiffres du Q1 ?', marketName: '🇸🇳 Sénégal' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '32px 28px' }
const brand = { fontSize: '14px', fontWeight: 'bold' as const, color: 'hsl(210, 36%, 17%)', letterSpacing: '0.5px', margin: '0 0 24px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(210, 36%, 17%)', margin: '0 0 20px' }
const text = { fontSize: '14px', color: 'hsl(231, 13%, 60%)', lineHeight: '1.6', margin: '0 0 20px' }
const quoteBox = { backgroundColor: 'hsl(36, 33%, 97%)', borderRadius: '14px', padding: '16px 24px', margin: '0 0 20px', borderLeft: '4px solid hsl(32, 20%, 75%)' }
const quoteText = { fontSize: '14px', color: 'hsl(210, 36%, 17%)', fontStyle: 'italic' as const, margin: '0', lineHeight: '1.6' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
