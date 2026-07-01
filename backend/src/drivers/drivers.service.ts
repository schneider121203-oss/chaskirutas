import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Driver, Vehicle, Document } from '../entities';
import { UpdateDriverDto, CreateVehicleDto, UploadDocumentDto } from './dto';
import { DriverStatus, VehicleStatus } from '../common/enums';

@Injectable()
export class DriversService {
  constructor(
    @InjectRepository(Driver)
    private readonly driverRepo: Repository<Driver>,
    @InjectRepository(Vehicle)
    private readonly vehicleRepo: Repository<Vehicle>,
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
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
      issuedAt: dto.issuedAt ? new Date(dto.issuedAt) : null,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
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
