import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Driver, Vehicle, Document, Company, User } from '../entities';
import { UpdateDriverDto, CreateVehicleDto, UploadDocumentDto, SubmitDeclarationDto } from './dto';
import { DriverStatus, VehicleStatus, DocumentKind } from '../common/enums';
import { ReniecService } from '../integrations/reniec.service';

// Marca del documento de Declaración Jurada TUC dentro de la tabla documents.
export const DECLARATION_DOC_NUMBER = 'DJ-TUC';

@Injectable()
export class DriversService {
  constructor(
    @InjectRepository(Driver)
    private readonly driverRepo: Repository<Driver>,
    @InjectRepository(Vehicle)
    private readonly vehicleRepo: Repository<Vehicle>,
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly reniecService: ReniecService,
  ) {}

  async getDriver(userId: string) {
    const driver = await this.driverRepo.findOne({
      where: { userId },
      relations: { user: true },
    });
    if (!driver) throw new NotFoundException('Conductor no encontrado');
    return driver;
  }

  async updateDriver(userId: string, dto: UpdateDriverDto) {
    const driver = await this.getDriver(userId);

    if (dto.bankName !== undefined) driver.bankName = dto.bankName;
    if (dto.bankAccountMasked !== undefined) driver.bankAccountMasked = dto.bankAccountMasked;
    if (dto.bankAccountCci !== undefined) driver.bankAccountCci = dto.bankAccountCci;
    driver.updatedAt = new Date();

    return this.driverRepo.save(driver);
  }

  async getVehicle(userId: string) {
    return this.vehicleRepo.findOne({
      where: { ownerUserId: userId },
    });
  }

  async createVehicle(userId: string, dto: CreateVehicleDto) {
    // Check if vehicle exists for plate
    const existing = await this.vehicleRepo.findOne({ where: { plate: dto.plate } });
    if (existing) throw new BadRequestException('El vehículo con esa placa ya está registrado');

    const vehicle = this.vehicleRepo.create({
      plate: dto.plate,
      brand: dto.brand,
      model: dto.model,
      year: dto.year,
      color: dto.color || null,
      seatsTotal: dto.seatsTotal,
      seatsForPassengers: dto.seatsTotal - 1,
      fuelType: dto.fuelType || 'GASOLINA',
      status: VehicleStatus.EN_REGISTRO,
      ownerUserId: userId,
      affiliatedCompanyId: 1, // Default main ChaskiRutas company
    });

    const saved = await this.vehicleRepo.save(vehicle);
    
    // Advance formalization if matching step
    await this.advanceFormalization(userId, 3); // CITV/SOAT/TarjetaPropiedad step details are usually step 3
    
    return saved;
  }

  async uploadDocument(userId: string, dto: UploadDocumentDto) {
    // Find driver vehicle if document is for vehicle
    const vehicle = await this.getVehicle(userId);

    const isVehicleDoc = ['SOAT', 'REVISION_TECNICA', 'TARJETA_PROPIEDAD', 'TUC'].includes(dto.kind);
    if (isVehicleDoc && !vehicle) {
      throw new BadRequestException('Debe registrar un vehículo antes de subir documentos del mismo');
    }

    const document = this.documentRepo.create({
      kind: dto.kind,
      documentNumber: dto.documentNumber,
      fileUrl: dto.fileUrl,
      // Guardar como 'YYYY-MM-DD' literal (columna date) para no correr el día por zona horaria.
      issuedAt: (dto.issuedAt || null) as any,
      expiresAt: (dto.expiresAt || null) as any,
      userId: isVehicleDoc ? null : userId,
      vehicleId: isVehicleDoc ? vehicle!.id : null,
      isVerified: false,
    });

    const saved = await this.documentRepo.save(document);

    // Dynamic advancement of formalization steps
    await this.updateFormalizationStep(userId);

    return saved;
  }

  async getDocuments(userId: string) {
    const vehicle = await this.getVehicle(userId);
    const vehicleId = vehicle ? vehicle.id : null;

    // Documents can belong to either the user or their vehicle
    const query = this.documentRepo.createQueryBuilder('doc')
      .where('doc.user_id = :userId', { userId });

    if (vehicleId) {
      query.orWhere('doc.vehicle_id = :vehicleId', { vehicleId });
    }

    return query.orderBy('doc.createdAt', 'DESC').getMany();
  }

  async toggleOnline(userId: string) {
    const driver = await this.getDriver(userId);
    if (driver.status !== DriverStatus.ACTIVO) {
      throw new BadRequestException(
        `No puede conectarse. Su estado actual es ${driver.status}. Debe completar los 6 pasos de formalización y ser aprobado por administración.`
      );
    }
    // Simple state toggle simulation via response (actual tracking would use Redis/WS memory)
    return { success: true, online: true, message: 'Conductor ahora está en línea' };
  }

  /**
   * ATAJO DE DESARROLLO (solo fuera de producción).
   * Marca todos los documentos del conductor como verificados y activa la cuenta,
   * simulando la aprobación del administrador. En producción la activación SOLO
   * la hace un ADMIN/OPERADOR desde el panel (POST /admin/drivers/:id/approve-all).
   */
  async devActivate(userId: string) {
    if (process.env.NODE_ENV === 'production') {
      throw new BadRequestException(
        'La auto-activación está deshabilitada en producción. Un administrador debe aprobar los documentos.'
      );
    }
    const driver = await this.getDriver(userId);

    // La Declaración Jurada TUC es obligatoria para formalizar.
    if (!(await this.hasAcceptedDeclaration(userId))) {
      throw new BadRequestException(
        'Debes completar y firmar la Declaración Jurada TUC antes de activar tu cuenta.'
      );
    }

    // Verificar todos los documentos propios del conductor.
    const docs = await this.documentRepo.find({ where: { userId } });
    const now = new Date();
    for (const doc of docs) {
      doc.isVerified = true;
      doc.verifiedBy = userId;
      doc.verifiedAt = now;
    }
    if (docs.length) await this.documentRepo.save(docs);

    driver.status = DriverStatus.ACTIVO;
    driver.formalizationStep = 6;
    driver.formalizationPct = 100;
    driver.updatedAt = new Date();
    await this.driverRepo.save(driver);

    return { success: true, status: driver.status, message: 'Cuenta activada (modo desarrollo).' };
  }

  // ── Declaración Jurada TUC ──────────────────────────────────────────────────

  private fmtDate(d: Date | string | null | undefined): string | null {
    if (!d) return null;
    // Si ya viene como 'YYYY-MM-DD' (columna date), no reparsear (evita corrimiento de zona).
    if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d)) return d.slice(0, 10);
    const date = typeof d === 'string' ? new Date(d) : d;
    if (Number.isNaN(date.getTime())) return null;
    // Componentes UTC para respetar la fecha almacenada (date-only = medianoche UTC).
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  /**
   * Devuelve la Declaración Jurada TUC con TODOS los campos autocompletados
   * desde la cuenta del conductor (usuario, licencia, empresa, vehículo,
   * documentos y domicilio de RENIEC). Marca los campos que faltan por llenar.
   */
  async getDeclaration(userId: string) {
    const driver = await this.driverRepo.findOne({ where: { userId }, relations: { user: true } });
    if (!driver) throw new NotFoundException('Conductor no encontrado');
    const user = driver.user;

    const vehicle = await this.vehicleRepo.findOne({ where: { ownerUserId: userId } });
    const companyId = vehicle?.affiliatedCompanyId ?? 1;
    const company = await this.companyRepo.findOne({ where: { id: companyId } });

    const docs = await this.documentRepo.find({
      where: [{ userId }, ...(vehicle ? [{ vehicleId: vehicle.id }] : [])],
    });
    const docOf = (kind: string) => docs.find((d) => String(d.kind) === kind);
    const soat = docOf('SOAT');
    const citv = docOf('REVISION_TECNICA');
    const propiedad = docOf('TARJETA_PROPIEDAD');

    // Domicilio del conductor vía RENIEC (mejor esfuerzo).
    let domicilioFiscal: string | null = null;
    try {
      if (user?.dni) {
        const r = await this.reniecService.verifyDni(user.dni);
        if (r.success) domicilioFiscal = r.address || null;
      }
    } catch {
      /* si RENIEC falla, queda como campo manual */
    }

    // Datos manuales guardados previamente (si ya firmó una vez).
    const existing = docs.find((d) => d.documentNumber === DECLARATION_DOC_NUMBER);
    let manual: any = {};
    if (existing?.fileUrl) {
      try { manual = JSON.parse(existing.fileUrl); } catch { /* ignore */ }
    }

    const conductor = {
      nombresCompletos: user?.fullName ?? null,
      dni: user?.dni ?? null,
      domicilioFiscal: domicilioFiscal ?? manual.domicilioFiscal ?? null,
      telefono: user?.phoneE164 ?? null,
      correo: user?.email ?? null,
      licenciaNumero: driver.licenseNumber ?? null,
      licenciaCategoria: driver.licenseClass ?? null,
    };
    const empresa = {
      razonSocial: company?.legalName ?? null,
      ruc: company?.ruc ?? null,
      representanteLegal: company?.legalRepName ?? null,
      direccion: company?.fiscalAddress ?? null,
      autorizacionAtu: manual.atuAuthorization ?? null,
    };
    const vehiculo = {
      placa: vehicle?.plate ?? null,
      marcaModelo: vehicle ? `${vehicle.brand} ${vehicle.model}` : null,
      anio: vehicle?.year ?? null,
      color: vehicle?.color ?? manual.color ?? null,
      numeroMotor: manual.engineNumber ?? null,
      tarjetaPropiedad: propiedad?.documentNumber ?? null,
      soatVigenteHasta: this.fmtDate(soat?.expiresAt),
      citvAprobadoHasta: this.fmtDate(citv?.expiresAt),
    };

    // Campos que el conductor debe llenar manualmente si siguen vacíos.
    const missingFields: string[] = [];
    if (!vehiculo.numeroMotor) missingFields.push('numeroMotor');
    if (!vehiculo.color) missingFields.push('color');
    if (!empresa.autorizacionAtu) missingFields.push('autorizacionAtu');
    if (!conductor.domicilioFiscal) missingFields.push('domicilioFiscal');

    return {
      tramite: { numero: null, fecha: this.fmtDate(new Date()) },
      conductor,
      empresa,
      vehiculo,
      pago: {
        concepto: 'Derecho de trámite — Emisión de TUC',
        monto: 41.2,
        estado: 'PENDIENTE',
        medio: 'Banco de la Nación / Pasarela digital ATU',
      },
      declaraciones: [
        'Toda la información y documentación presentada es veraz, completa y auténtica (Art. 42° Ley N° 27444).',
        'El vehículo cumple las condiciones técnicas y de seguridad del D.S. N° 017-2009-MTC.',
        'Cuento con licencia A-IIA o A-IIB vigente, habilitada para servicio de taxi.',
        'No registro antecedentes penales ni policiales que me impidan prestar el servicio.',
        'El vehículo cuenta con SOAT vigente y CITV aprobado.',
        'Operaré exclusivamente bajo la modalidad autorizada por la ATU en Lima y Callao.',
        'Acepto que la TUC se emite a nombre de la empresa de transporte señalada.',
        'Mantendré vigentes todos los documentos durante la validez de la TUC (10 años).',
        'Conozco que la información falsa constituye delito contra la fe pública (Art. 411° C.P.).',
      ],
      baseLegal: ['Ley N° 27444', 'Ley N° 27181', 'D.S. N° 017-2009-MTC', 'Ley N° 30900', 'D.S. N° 012-2019-MTC'],
      missingFields,
      alreadyAccepted: !!existing,
    };
  }

  /**
   * Firma la Declaración Jurada bajo juramento. Persiste los campos manuales
   * y crea/actualiza el documento DJ-TUC. Avanza la formalización al paso 5.
   */
  async submitDeclaration(userId: string, dto: SubmitDeclarationDto) {
    if (!dto.acceptedUnderOath) {
      throw new BadRequestException('Debes aceptar la Declaración Jurada bajo juramento para continuar.');
    }
    const driver = await this.getDriver(userId);

    // Persistir el color en el vehículo si lo proporcionó y faltaba.
    const vehicle = await this.vehicleRepo.findOne({ where: { ownerUserId: userId } });
    if (vehicle && dto.color && !vehicle.color) {
      vehicle.color = dto.color;
      await this.vehicleRepo.save(vehicle);
    }

    // Guardar los campos manuales dentro del documento (JSON en file_url).
    const manual = JSON.stringify({
      engineNumber: dto.engineNumber ?? null,
      color: dto.color ?? vehicle?.color ?? null,
      atuAuthorization: dto.atuAuthorization ?? null,
      acceptedAt: new Date().toISOString(),
    });

    let doc = await this.documentRepo.findOne({
      where: { userId, documentNumber: DECLARATION_DOC_NUMBER },
    });
    if (!doc) {
      doc = this.documentRepo.create({
        kind: DocumentKind.OTRO,
        userId,
        documentNumber: DECLARATION_DOC_NUMBER,
        issuingEntity: 'ATU',
      });
    }
    doc.fileUrl = manual;
    await this.documentRepo.save(doc);

    // Avanzar formalización (la Declaración Jurada corresponde al paso 5).
    if (driver.formalizationStep < 5) {
      driver.formalizationStep = 5;
      driver.formalizationPct = Math.round((5 / 6) * 100);
      await this.driverRepo.save(driver);
    }

    return { success: true, message: 'Declaración Jurada TUC firmada correctamente.' };
  }

  // ¿El conductor ya firmó la Declaración Jurada TUC?
  async hasAcceptedDeclaration(userId: string): Promise<boolean> {
    const doc = await this.documentRepo.findOne({
      where: { userId, documentNumber: DECLARATION_DOC_NUMBER },
    });
    return !!doc;
  }

  // Helper to dynamically update formalization steps based on uploaded documents
  private async updateFormalizationStep(userId: string) {
    const driver = await this.getDriver(userId);
    const docs = await this.getDocuments(userId);

    const hasDni = docs.some(d => d.kind === 'DNI');
    const hasLicense = docs.some(d => d.kind === 'LICENCIA');
    const hasSoat = docs.some(d => d.kind === 'SOAT');
    
    let step = 1;
    if (hasDni) step = 2;
    if (hasDni && hasLicense) step = 3;
    if (hasDni && hasLicense && hasSoat) step = 4; // Contrato is next
    
    // Max steps is 6, set appropriate percentage
    const pct = Math.round((step / 6) * 100);
    driver.formalizationStep = step;
    driver.formalizationPct = pct;
    await this.driverRepo.save(driver);
  }

  private async advanceFormalization(userId: string, step: number) {
    const driver = await this.getDriver(userId);
    if (driver.formalizationStep < step) {
      driver.formalizationStep = step;
      driver.formalizationPct = Math.round((step / 6) * 100);
      await this.driverRepo.save(driver);
    }
  }
}
