import { Injectable, ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User, AuthOtpCode, UserRoleEntity, Passenger, Driver } from '../entities';
import { UserStatus } from '../common/enums';
import { RegisterDto, OtpSendDto, OtpVerifyDto } from './dto';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(AuthOtpCode)
    private readonly otpRepo: Repository<AuthOtpCode>,
    @InjectRepository(UserRoleEntity)
    private readonly roleRepo: Repository<UserRoleEntity>,
    @InjectRepository(Passenger)
    private readonly passengerRepo: Repository<Passenger>,
    @InjectRepository(Driver)
    private readonly driverRepo: Repository<Driver>,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * POST /auth/register — Crear usuario + rol + perfil
   */
  async register(dto: RegisterDto) {
    // Verificar unicidad
    const existing = await this.userRepo.findOne({
      where: [{ phoneE164: dto.phone }, { dni: dto.dni }],
    });
    if (existing) {
      throw new ConflictException('Ya existe un usuario con ese teléfono o DNI');
    }

    // Validar datos de conductor ANTES de tocar la BD (evita estado parcial).
    let licenseExpiresAt: Date | undefined;
    if (dto.role === 'CONDUCTOR') {
      if (!dto.licenseNumber || !dto.licenseClass || !dto.licenseExpiresAt) {
        throw new BadRequestException('Conductor requiere número, clase y fecha de expiración de licencia.');
      }
      licenseExpiresAt = new Date(dto.licenseExpiresAt);
      if (Number.isNaN(licenseExpiresAt.getTime())) {
        throw new BadRequestException('La fecha de expiración de la licencia es inválida (usa el formato AAAA-MM-DD).');
      }
    }

    // Hash de la contraseña
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Crear usuario + rol + perfil en una TRANSACCIÓN: si algo falla, se revierte
    // todo (no quedan usuarios "a medias" sin perfil).
    const savedUser = await this.userRepo.manager.transaction(async (em) => {
      const user = await em.save(this.userRepo.create({
        phoneE164: dto.phone,
        passwordHash,
        fullName: dto.fullName,
        dni: dto.dni,
        email: dto.email || null,
        status: UserStatus.PENDIENTE,
      }));

      await em.save(this.roleRepo.create({ userId: user.id, role: dto.role }));

      if (dto.role === 'PASAJERO') {
        await em.save(this.passengerRepo.create({ userId: user.id }));
      } else if (dto.role === 'CONDUCTOR') {
        await em.save(this.driverRepo.create({
          userId: user.id,
          licenseNumber: dto.licenseNumber,
          licenseClass: dto.licenseClass,
          licenseExpiresAt,
        }));
      }
      return user;
    });

    return {
      message: 'Usuario registrado exitosamente',
      userId: savedUser.id,
      role: dto.role,
    };
  }

  /**
   * POST /auth/otp/send — Generar OTP y guardarlo hasheado
   */
  async sendOtp(dto: OtpSendDto) {
    const user = await this.userRepo.findOne({ where: { phoneE164: dto.phone } });
    if (!user) {
      throw new BadRequestException('Teléfono no registrado');
    }

    // Generar OTP (siempre 1234 para testing en desarrollo y producción sin Twilio real)
    const code = '1234';
    const codeHash = await bcrypt.hash(code, 10);

    const otp = this.otpRepo.create({
      userId: user.id,
      channel: 'SMS',
      codeHash,
      sentTo: dto.phone,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutos
    });
    await this.otpRepo.save(otp);

    // En producción: enviar SMS real
    // En dev: el OTP es siempre 1234
    return {
      message: 'OTP enviado',
      devCode: code,
      expiresIn: 300, // 5 minutos
    };
  }

  /**
   * POST /auth/otp/verify — Validar OTP → devolver JWT
   */
  async verifyOtp(dto: OtpVerifyDto) {
    const user = await this.userRepo.findOne({
      where: { phoneE164: dto.phone },
      relations: { roles: true },
    });
    if (!user) {
      throw new UnauthorizedException('Teléfono no registrado');
    }

    // Buscar OTP no consumido y no expirado
    const otps = await this.otpRepo.find({
      where: { userId: user.id },
      order: { createdAt: 'DESC' },
      take: 5,
    });

    const validOtp = await this.findValidOtp(otps, dto.code);
    if (!validOtp) {
      throw new UnauthorizedException('Código OTP inválido o expirado');
    }

    // Marcar como consumido
    validOtp.consumedAt = new Date();
    await this.otpRepo.save(validOtp);

    // Actualizar estado del usuario
    if (user.status === UserStatus.PENDIENTE) {
      user.status = UserStatus.ACTIVO;
      user.phoneVerifiedAt = new Date();
    }
    user.lastLoginAt = new Date();
    await this.userRepo.save(user);

    // Generar tokens
    const roles = user.roles.map((r) => r.role);
    const payload: JwtPayload = {
      sub: user.id,
      phone: user.phoneE164,
      roles,
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        fullName: user.fullName,
        phone: user.phoneE164,
        dni: user.dni,
        status: user.status,
        roles,
      },
    };
  }

  /**
   * POST /auth/refresh — Rotar refresh token
   */
  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshToken);
      const newPayload: JwtPayload = {
        sub: payload.sub,
        phone: payload.phone,
        roles: payload.roles,
      };
      return {
        accessToken: this.jwtService.sign(newPayload, { expiresIn: '15m' }),
        refreshToken: this.jwtService.sign(newPayload, { expiresIn: '7d' }),
      };
    } catch {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }
  }

  /**
   * GET /auth/me — Perfil del usuario autenticado
   */
  async getProfile(userId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: { roles: true, passenger: true, driver: true },
    });
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }
    return {
      id: user.id,
      fullName: user.fullName,
      phone: user.phoneE164,
      email: user.email,
      dni: user.dni,
      status: user.status,
      photoUrl: user.photoUrl,
      roles: user.roles.map((r) => r.role),
      passenger: user.passenger || undefined,
      driver: user.driver || undefined,
    };
  }

  // --- Helpers ---
  private async findValidOtp(otps: AuthOtpCode[], code: string): Promise<AuthOtpCode | null> {
    for (const otp of otps) {
      if (otp.consumedAt) continue;
      if (new Date(otp.expiresAt) < new Date()) continue;
      const isValid = await bcrypt.compare(code, otp.codeHash);
      if (isValid) return otp;
    }
    return null;
  }
}
