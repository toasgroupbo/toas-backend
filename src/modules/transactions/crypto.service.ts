import { Injectable, OnModuleInit } from '@nestjs/common';
import * as forge from 'node-forge';
import * as path from 'path';
import * as fs from 'fs';

import { envs } from 'src/config/environments/environments';

import { GetBatchDetailEncrypt } from './interfaces/toEncrypt/getbatchdetail-to-encrypt.interface';
import { AuthorizedBachToEncrypt } from './interfaces/toEncrypt/authorizedbach-to-encrypt.interface';
import { ProcessMultipleToEncrypt } from './interfaces/toEncrypt/processmultiple-to-encrypt.interface';

@Injectable()
export class CryptoService implements OnModuleInit {
  private businessCert: forge.pki.Certificate;
  private encCert: forge.pki.Certificate;
  private signingPrivateKey: forge.pki.PrivateKey;
  private pfxEncBuffer: Buffer;

  onModuleInit() {
    this.loadCertificates();
  }
  //? ============================================================================================== ?/
  //?                                     EncryptData                                                ?/
  //? ============================================================================================== ?/

  encryptProcessMultiple(payload: ProcessMultipleToEncrypt): {
    data: string;
    signature: string;
  } {
    payload.companyId = +envs.H2H_COMPANYID;
    payload.password = envs.H2H_PASSWORD_PAYLOAD;

    const data = this.encryptPayload(payload);
    const signature = this.signData(data);
    return { data, signature };
  }

  //? ============================================================================================== ?/

  encryptAuthorizedBatch(payload: AuthorizedBachToEncrypt): {
    data: string;
    signature: string;
  } {
    payload.companyId = +envs.H2H_COMPANYID;
    payload.password = 'SantaCruz2026';

    const data = this.encryptPayload(payload);
    const signature = this.signData(data);
    return { data, signature };
  }

  //? ============================================================================================== ?/

  encryptGetBatchDetail(payload: GetBatchDetailEncrypt): {
    data: string;
    signature: string;
  } {
    payload.companyId = +envs.H2H_COMPANYID;
    payload.password = 'SantaCruz2026';

    const data = this.encryptPayload(payload);
    const signature = this.signData(data);
    return { data, signature };
  }

  //? ============================================================================================== ?/
  //?                                     DecryptData                                                ?/
  //? ============================================================================================== ?/

  decryptData<T = any>(
    encryptedBase64: string,
    useEncCert: boolean = false,
  ): T {
    if (useEncCert) {
      return this.decryptResponse(encryptedBase64);
    }

    const encryptedBytes = forge.util.decode64(encryptedBase64);
    const { key, iv } = this.deriveKeyAndIVFromBusiness();

    const decipher = forge.cipher.createDecipher('AES-CBC', key);
    decipher.start({ iv });
    decipher.update(forge.util.createBuffer(encryptedBytes));

    const success = decipher.finish();
    if (!success) {
      throw new Error('Decryption failed');
    }

    const decryptedBytes = decipher.output.getBytes();
    const result = Buffer.from(decryptedBytes, 'binary').toString('utf8');

    return JSON.parse(result);
  }

  //? ============================================================================================== ?/

  private signData(data: string): string {
    const md = forge.md.sha256.create();
    md.update(data, 'utf8');
    const signature = (this.signingPrivateKey as any).sign(md);
    return forge.util.encode64(signature);
  }

  //? ============================================================================================== ?/

  // Cifrar para enviar al BCP (usa BUSINESS)
  private encryptPayload<T = any>(payload: T): string {
    const json = JSON.stringify(payload);
    const dataBytes = forge.util.encodeUtf8(json);
    const { key, iv } = this.deriveKeyAndIVFromBusiness();

    const cipher = forge.cipher.createCipher('AES-CBC', key);
    cipher.start({ iv });
    cipher.update(forge.util.createBuffer(dataBytes));
    cipher.finish();

    const encrypted = forge.util.encode64(cipher.output.getBytes());
    return encrypted;
  }

  //? ============================================================================================== ?/

  // Descifrar respuesta del BCP (usa ENC_DESA)
  private decryptResponse<T = any>(encryptedBase64: string): T {
    const encryptedBytes = forge.util.decode64(encryptedBase64);
    const { key, iv } = this.deriveKeyAndIVFromEncCert(); // ← Cambiado a ENC_DESA

    const decipher = forge.cipher.createDecipher('AES-CBC', key);
    decipher.start({ iv });
    decipher.update(forge.util.createBuffer(encryptedBytes));

    const success = decipher.finish();
    if (!success) {
      throw new Error('Decryption failed');
    }

    const decryptedBytes = decipher.output.getBytes();
    const result = Buffer.from(decryptedBytes, 'binary').toString('utf8');

    return JSON.parse(result);
  }

  //? ============================================================================================== ?/

  private loadCertificates() {
    try {
      // 1. Cargar certificado BUSINESS
      const businessCertPath = path.join(
        process.cwd(),
        'static',
        'certs',
        'BUSINESS_PROD.crt', //'BUSINESS.crt',
      );
      this.businessCert = this.loadCertificate(businessCertPath);

      // 2. Cargar PFX
      const pfxPath = path.join(
        process.cwd(),
        'static',
        'certs',
        'ENC_TOASS_PROD.pfx', //'ENC_DESA.pfx',
      );
      this.pfxEncBuffer = fs.readFileSync(pfxPath);

      // 3. Extraer clave privada y certificado del PFX
      const { privateKey, certificate } = this.extractFromPfx(
        this.pfxEncBuffer,
        envs.H2H_PFX_PASSWORD,
      );
      this.signingPrivateKey = privateKey;
      this.encCert = certificate; // ← Guardar certificado para descifrar respuestas
    } catch (error) {
      throw error;
    }
  }

  //? ============================================================================================== ?/

  private loadCertificate(certPath: string): forge.pki.Certificate {
    const buffer = fs.readFileSync(certPath);
    const content = buffer.toString('utf8');

    if (content.includes('BEGIN CERTIFICATE')) {
      return forge.pki.certificateFromPem(content.trim());
    }

    const asn1 = forge.asn1.fromDer(buffer.toString('binary'));
    return forge.pki.certificateFromAsn1(asn1);
  }

  //? ============================================================================================== ?/

  private extractFromPfx(
    pfxBuffer: Buffer,
    password: string,
  ): { privateKey: forge.pki.PrivateKey; certificate: forge.pki.Certificate } {
    const p12Asn1 = forge.asn1.fromDer(pfxBuffer.toString('binary'));
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);

    let privateKey: forge.pki.PrivateKey | null = null;
    let certificate: forge.pki.Certificate | null = null;

    p12.safeContents.forEach((safeContent) => {
      safeContent.safeBags.forEach((safeBag) => {
        if (safeBag.key) {
          privateKey = safeBag.key;
        }
        if (safeBag.cert) {
          certificate = safeBag.cert;
        }
      });
    });

    if (!privateKey || !certificate) {
      throw new Error('No se pudo extraer clave privada o certificado del PFX');
    }

    return { privateKey, certificate };
  }

  //? ============================================================================================== ?/

  // Derivar clave usando certificado BUSINESS (para enviar datos)
  private deriveKeyAndIVFromBusiness(): { key: string; iv: string } {
    return this.deriveKeyAndIVFromCertificate(this.businessCert);
  }

  //? ============================================================================================== ?/

  // Derivar clave usando certificado ENC_DESA (para recibir/descifrar respuestas)
  private deriveKeyAndIVFromEncCert(): { key: string; iv: string } {
    return this.deriveKeyAndIVFromCertificate(this.encCert);
  }

  //? ============================================================================================== ?/

  private deriveKeyAndIVFromCertificate(cert: forge.pki.Certificate): {
    key: string;
    iv: string;
  } {
    const rsaPublicKeyAsn1 = forge.pki.publicKeyToRSAPublicKey(cert.publicKey);
    const publicKeyDer = forge.asn1.toDer(rsaPublicKeyAsn1).bytes();

    const md = forge.md.sha256.create();
    md.update(publicKeyDer);
    const passwordBytes = md.digest().getBytes();

    const salt = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]).toString('binary');
    const derived = forge.pkcs5.pbkdf2(passwordBytes, salt, 1000, 48);

    return {
      key: derived.slice(0, 32),
      iv: derived.slice(32, 48),
    };
  }

  //? ============================================================================================== ?/

  verifySignature(
    data: string,
    signature: string,
    certificate?: forge.pki.Certificate,
  ): boolean {
    const md = forge.md.sha256.create();
    md.update(data, 'utf8');
    const decodedSignature = forge.util.decode64(signature);
    const cert = certificate || this.businessCert;

    return (cert.publicKey as any).verify(
      md.digest().bytes(),
      decodedSignature,
    );
  }
}
