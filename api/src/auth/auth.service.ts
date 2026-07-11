import { Injectable, Logger, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { Repository } from 'typeorm';
import { CryptoService } from '../common/crypto.service';
import { TotpService } from '../common/totp.service';
import { AdminUser } from '../entities/admin-user.entity';

export interface LoginResult {
  accessToken: string;
  user: { id: string; email: string; name: string; role: string };
}

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(AdminUser) private readonly users: Repository<AdminUser>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly crypto: CryptoService,
    private readonly totp: TotpService,
  ) {}

  /** İlk açılışta hiç kullanıcı yoksa env'den admin kullanıcısı tohumlar. */
  async onModuleInit(): Promise<void> {
    const count = await this.users.count();
    if (count > 0) return;
    const email = this.config.get<string>('admin.email')!;
    const password = this.config.get<string>('admin.password')!;
    await this.users.save(
      this.users.create({
        email,
        name: 'Yönetici',
        passwordHash: this.hashPassword(password),
        role: 'ADMIN',
      }),
    );
    this.logger.warn(`İlk admin kullanıcısı oluşturuldu: ${email} — şifreyi hemen değiştirin!`);
  }

  hashPassword(password: string): string {
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(password, salt, 64).toString('hex');
    return `scrypt$${salt}$${hash}`;
  }

  verifyPassword(password: string, stored: string): boolean {
    const [scheme, salt, hash] = stored.split('$');
    if (scheme !== 'scrypt' || !salt || !hash) return false;
    const candidate = scryptSync(password, salt, 64);
    const expected = Buffer.from(hash, 'hex');
    return candidate.length === expected.length && timingSafeEqual(candidate, expected);
  }

  async login(email: string, password: string, totpCode?: string): Promise<LoginResult> {
    const user = await this.users
      .createQueryBuilder('u')
      .addSelect('u.totpSecretEnc')
      .where('u.email = :email', { email: email.toLowerCase().trim() })
      .getOne();
    // Kullanıcı yokken de sabit süreli çalışması için sahte hash doğrula (user enumeration önlemi)
    const stored = user?.passwordHash ?? 'scrypt$00$00';
    if (!user || !this.verifyPassword(password, stored)) {
      throw new UnauthorizedException('E-posta veya şifre hatalı');
    }
    if (user.totpEnabled && user.totpSecretEnc) {
      if (!totpCode) throw new UnauthorizedException('TOTP_REQUIRED');
      if (!this.totp.verify(this.crypto.decrypt(user.totpSecretEnc), totpCode)) {
        throw new UnauthorizedException('Doğrulama kodu hatalı');
      }
    }
    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    return {
      accessToken,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    };
  }

  listUsers(): Promise<Pick<AdminUser, 'id' | 'email' | 'name' | 'role' | 'createdAt' | 'totpEnabled'>[]> {
    return this.users.find({
      select: ['id', 'email', 'name', 'role', 'createdAt', 'totpEnabled'],
      order: { createdAt: 'ASC' },
    });
  }

  async createUser(email: string, name: string, password: string): Promise<AdminUser> {
    const user = await this.users.save(
      this.users.create({
        email: email.toLowerCase().trim(),
        name,
        passwordHash: this.hashPassword(password),
        role: 'ADMIN',
      }),
    );
    return { ...user, passwordHash: '' } as AdminUser;
  }

  async deleteUser(id: string, requesterId: string): Promise<void> {
    if (id === requesterId) throw new UnauthorizedException('Kendi hesabınızı silemezsiniz');
    const total = await this.users.count();
    if (total <= 1) throw new UnauthorizedException('Son admin silinemez');
    await this.users.delete(id);
  }

  /** 2FA kurulumunu başlatır: sır üretilir (henüz zorunlu değil), otpauth URL döner. */
  async setupTotp(userId: string): Promise<{ secret: string; otpauthUrl: string }> {
    const user = await this.users.findOneBy({ id: userId });
    if (!user) throw new UnauthorizedException('Kullanıcı bulunamadı');
    if (user.totpEnabled) throw new UnauthorizedException('2FA zaten etkin; önce devre dışı bırakın');
    const secret = this.totp.generateSecret();
    await this.users.update(userId, { totpSecretEnc: this.crypto.encrypt(secret) });
    return { secret, otpauthUrl: this.totp.otpauthUrl(secret, user.email) };
  }

  /** Kurulumdaki sırla üretilen kod doğrulanırsa 2FA'yı etkinleştirir. */
  async enableTotp(userId: string, code: string): Promise<void> {
    const user = await this.users
      .createQueryBuilder('u').addSelect('u.totpSecretEnc')
      .where('u.id = :id', { id: userId }).getOne();
    if (!user?.totpSecretEnc) throw new UnauthorizedException('Önce 2FA kurulumunu başlatın');
    if (!this.totp.verify(this.crypto.decrypt(user.totpSecretEnc), code)) {
      throw new UnauthorizedException('Doğrulama kodu hatalı');
    }
    await this.users.update(userId, { totpEnabled: true });
    this.logger.log(`2FA etkinleştirildi: ${user.email}`);
  }

  /** Geçerli kodla 2FA'yı kapatır ve sırrı siler. */
  async disableTotp(userId: string, code: string): Promise<void> {
    const user = await this.users
      .createQueryBuilder('u').addSelect('u.totpSecretEnc')
      .where('u.id = :id', { id: userId }).getOne();
    if (!user?.totpSecretEnc || !user.totpEnabled) throw new UnauthorizedException('2FA etkin değil');
    if (!this.totp.verify(this.crypto.decrypt(user.totpSecretEnc), code)) {
      throw new UnauthorizedException('Doğrulama kodu hatalı');
    }
    await this.users.update(userId, { totpEnabled: false, totpSecretEnc: null as unknown as string });
    this.logger.warn(`2FA devre dışı bırakıldı: ${user.email}`);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.users.findOneBy({ id: userId });
    if (!user || !this.verifyPassword(currentPassword, user.passwordHash)) {
      throw new UnauthorizedException('Mevcut şifre hatalı');
    }
    user.passwordHash = this.hashPassword(newPassword);
    await this.users.save(user);
  }
}
