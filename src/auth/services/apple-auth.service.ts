import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import * as jwksRsa from 'jwks-rsa';

const APPLE_JWKS_URI = 'https://appleid.apple.com/auth/keys';
const APPLE_ISSUER = 'https://appleid.apple.com';
const BUNDLE_ID = 'com.toasgroup.busapp'; // ✅ Debe coincidir con tu app.json bundleIdentifier

export interface AppleTokenClaims {
  sub: string; // Apple's stable unique user ID — ÚSALO como primary key
  email?: string; // Provided only on first login
  email_verified?: boolean;
  iss: string;
  aud: string;
  exp: number;
  iat: number;
}

@Injectable()
export class AppleAuthService {
  private readonly jwksClient = new jwksRsa.JwksClient({
    jwksUri: APPLE_JWKS_URI,
    cache: true,
    cacheMaxEntries: 5,
    cacheMaxAge: 600000, // 10 minutos
  });

  async verifyIdentityToken(identityToken: string): Promise<AppleTokenClaims> {
    // --------------------------------------------------
    // 1. Decodificar token para obtener KID
    // --------------------------------------------------

    const decoded = jwt.decode(identityToken, { complete: true });
    if (!decoded || typeof decoded === 'string') {
      throw new UnauthorizedException('Invalid Apple identity token format');
    }

    const kid = decoded.header?.kid;
    if (!kid) {
      throw new UnauthorizedException('Apple token missing key ID (kid)');
    }

    // --------------------------------------------------
    // 2. Obtener clave pública desde Apple
    // --------------------------------------------------

    let signingKey: string;
    try {
      const key = await this.jwksClient.getSigningKey(kid);
      signingKey = key.getPublicKey();
    } catch (err) {
      throw new UnauthorizedException(
        `Could not fetch Apple public key for kid=${kid}: ${err.message}`,
      );
    }

    // --------------------------------------------------
    // 3. Verificar token
    // --------------------------------------------------

    let claims: AppleTokenClaims;
    try {
      claims = jwt.verify(identityToken, signingKey, {
        algorithms: ['RS256'],
        issuer: APPLE_ISSUER,
        audience: BUNDLE_ID,
      }) as AppleTokenClaims;

      return claims;
    } catch (err) {
      throw new UnauthorizedException(
        `Apple token verification failed: ${err.message}`,
      );
    }
  }
}
