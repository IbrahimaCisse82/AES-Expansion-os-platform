/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface EmailChangeEmailProps {
  siteName: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({ siteName, email, newEmail, confirmationUrl }: EmailChangeEmailProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Confirmez votre changement d'email pour {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>ExpansionOS</Text>
        <Heading style={h1}>Changement d'adresse email</Heading>
        <Text style={text}>
          Vous avez demandé à changer votre adresse email pour {siteName} de{' '}
          <Link href={`mailto:${email}`} style={link}>{email}</Link> vers{' '}
          <Link href={`mailto:${newEmail}`} style={link}>{newEmail}</Link>.
        </Text>
        <Text style={text}>Cliquez sur le bouton ci-dessous pour confirmer ce changement :</Text>
        <Button style={button} href={confirmationUrl}>
          Confirmer le changement
        </Button>
        <Text style={footer}>
          Si vous n'avez pas demandé ce changement, sécurisez votre compte immédiatement.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '32px 28px' }
const brand = { fontSize: '14px', fontWeight: 'bold' as const, color: 'hsl(210, 36%, 17%)', letterSpacing: '0.5px', margin: '0 0 24px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(210, 36%, 17%)', margin: '0 0 20px' }
const text = { fontSize: '14px', color: 'hsl(231, 13%, 60%)', lineHeight: '1.6', margin: '0 0 20px' }
const link = { color: 'hsl(210, 36%, 17%)', textDecoration: 'underline' }
const button = { backgroundColor: 'hsl(210, 36%, 17%)', color: 'hsl(36, 33%, 97%)', fontSize: '14px', borderRadius: '14px', padding: '12px 24px', textDecoration: 'none', fontWeight: '600' as const }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
