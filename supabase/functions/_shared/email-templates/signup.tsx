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

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Confirmez votre email pour {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>ExpansionOS</Text>
        <Heading style={h1}>Confirmez votre adresse email</Heading>
        <Text style={text}>
          Merci de vous être inscrit sur{' '}
          <Link href={siteUrl} style={link}>
            <strong>{siteName}</strong>
          </Link> !
        </Text>
        <Text style={text}>
          Veuillez confirmer votre adresse email (
          <Link href={`mailto:${recipient}`} style={link}>{recipient}</Link>
          ) en cliquant sur le bouton ci-dessous :
        </Text>
        <Button style={button} href={confirmationUrl}>
          Vérifier mon email
        </Button>
        <Text style={footer}>
          Si vous n'avez pas créé de compte, vous pouvez ignorer cet email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '32px 28px' }
const brand = { fontSize: '14px', fontWeight: 'bold' as const, color: 'hsl(210, 36%, 17%)', letterSpacing: '0.5px', margin: '0 0 24px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(210, 36%, 17%)', margin: '0 0 20px' }
const text = { fontSize: '14px', color: 'hsl(231, 13%, 60%)', lineHeight: '1.6', margin: '0 0 20px' }
const link = { color: 'hsl(210, 36%, 17%)', textDecoration: 'underline' }
const button = { backgroundColor: 'hsl(210, 36%, 17%)', color: 'hsl(36, 33%, 97%)', fontSize: '14px', borderRadius: '14px', padding: '12px 24px', textDecoration: 'none', fontWeight: '600' as const }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
