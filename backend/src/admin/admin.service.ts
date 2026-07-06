import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, Driver, Document, Trip, Route, Incident, Company } from '../entities';
import { VerifyDocumentDto } from './dto';
import { DriverStatus, UserRole } from '../common/enums';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Driver)
    private readonly driverRepo: Repository<Driver>,
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
    @InjectRepository(Trip)
    private readonly tripRepo: Repository<Trip>,
    @InjectRepository(Route)
    private readonly routeRepo: Repository<Route>,
    @InjectRepository(Incident)
    private readonly incidentRepo: Repository<Incident>,
  ) {}

  async getDashboard() {
    const tripsCount = await this.tripRepo.count();
    const activeDriversCount = await this.driverRepo.count({
      where: { status: DriverStatus.ACTIVO },
    });
    const routesCount = await this.routeRepo.count({
      where: { isActive: true },
    });
    const sosCount = await this.incidentRepo.count({
      where: { type: 'SOS' as any }, // incident type SOS
    });

    // Sum earnings
    const earnings = await this.tripRepo.manager.query(
      `SELECT COALESCE(SUM(gross_pen), 0) as gross, COALESCE(SUM(platform_fee_pen), 0) as commission FROM chaski.driver_earnings`
    );

    const grossRevenue = Number(earnings[0].gross);
    const platformCommission = Number(earnings[0].commission);

    return {
      tripsTotal: tripsCount,
      activeDrivers: activeDriversCount,
      activeRoutes: routesCount,
      sosIncidents: sosCount,
      financials: {
        grossRevenue,
        platformCommission,
        netPayouts: grossRevenue - platformCommission,
      },
    };
  }

  async getDrivers() {
    return this.driverRepo.find({
      relations: { user: true },
      order: { createdAt: 'DESC' },
    });
  }

  async getDriverDetails(id: string) {
    const driver = await this.driverRepo.findOne({
      where: { userId: id },
      relations: { user: true },
    });
    if (!driver) throw new NotFoundException('Conductor no encontrado');

    const vehicle = await this.tripRepo.manager.createQueryBuilder('Vehicle', 'v')
      .where('v.owner_user_id = :id', { id })
      .getRawOne();

    // Fetch documents
    const documents = await this.documentRepo.find({
      where: [
        { userId: id },
        ...(vehicle ? [{ vehicleId: vehicle.v_id }] : []),
      ],
      order: { createdAt: 'DESC' },
    });

    return {
      driver,
      vehicle,
      documents,
    };
  }

  // Documentos obligatorios para activar un conductor (Sección 6):
  // DNI + Licencia (del usuario) y SOAT + CITV (REVISION_TECNICA) + Tarjeta de Propiedad (del vehículo).
  private static readonly REQUIRED_DRIVER_DOCS = [
    'DNI',
    'LICENCIA',
    'SOAT',
    'REVISION_TECNICA',
    'TARJETA_PROPIEDAD',
  ];

  async verifyDocument(id: string, dto: VerifyDocumentDto, adminUserId: string) {
    const document = await this.documentRepo.findOne({ where: { id } });
    if (!document) throw new NotFoundException('Documento no encontrado');

    document.isVerified = dto.isVerified;
    document.verifiedBy = adminUserId;
    document.verifiedAt = new Date();
    await this.documentRepo.save(document);

    let activated = false;
    // El usuario dueño puede estar en el propio doc (DNI/LICENCIA) o en el vehículo asociado.
    const targetUserId = document.userId ?? (await this.resolveOwnerFromVehicleDoc(document));
    if (targetUserId && dto.isVerified) {
      activated = await this.activateDriverIfComplete(targetUserId);
    }

    return { success: true, isVerified: dto.isVerified, driverActivated: activated };
  }

  // "Aprobar todo": verifica todos los documentos pendientes del conductor y activa la cuenta.
  async approveAllDocuments(userId: string, adminUserId: string) {
    const driver = await this.driverRepo.findOne({ where: { userId } });
    if (!driver) throw new NotFoundException('Conductor no encontrado');

    const vehicle = await this.tripRepo.manager.createQueryBuilder('Vehicle', 'v')
      .where('v.owner_user_id = :id', { id: userId })
      .getRawOne();

    const docs = await this.documentRepo.find({
      where: [
        { userId },
        ...(vehicle ? [{ vehicleId: vehicle.v_id }] : []),
      ],
    });

    const now = new Date();
    for (const doc of docs) {
      doc.isVerified = true;
      doc.verifiedBy = adminUserId;
      doc.verifiedAt = now;
    }
    if (docs.length) await this.documentRepo.save(docs);

    const activated = await this.activateDriverIfComplete(userId);
    return {
      success: true,
      documentsApproved: docs.length,
      driverActivated: activated,
      missing: activated ? [] : await this.missingDocs(userId),
    };
  }

  // Activa al conductor solo si TODOS los documentos obligatorios están verificados.
  private async activateDriverIfComplete(userId: string): Promise<boolean> {
    const missing = await this.missingDocs(userId);
    if (missing.length > 0) return false;

    const driver = await this.driverRepo.findOne({ where: { userId } });
    if (driver && driver.status !== DriverStatus.ACTIVO) {
      driver.status = DriverStatus.ACTIVO;
      driver.formalizationStep = 6;
      driver.formalizationPct = 100;
      await this.driverRepo.save(driver);
      return true;
    }
    return false;
  }

  // Lista de tipos de documento obligatorios que aún NO están verificados para el conductor.
  private async missingDocs(userId: string): Promise<string[]> {
    const vehicle = await this.tripRepo.manager.createQueryBuilder('Vehicle', 'v')
      .where('v.owner_user_id = :id', { id: userId })
      .getRawOne();

    const verified = await this.documentRepo.find({
      where: [
        { userId, isVerified: true },
        ...(vehicle ? [{ vehicleId: vehicle.v_id, isVerified: true }] : []),
      ],
    });
    const verifiedKinds = new Set(verified.map((d) => String(d.kind)));
    const missing = AdminService.REQUIRED_DRIVER_DOCS.filter((k) => !verifiedKinds.has(k));

    // La Declaración Jurada TUC (documento DJ-TUC) es obligatoria para activar.
    const declaration = await this.documentRepo.findOne({
      where: { userId, documentNumber: 'DJ-TUC' },
    });
    if (!declaration) missing.push('DECLARACION_JURADA');

    return missing;
  }

  // Si el documento pertenece a un vehículo (SOAT/CITV/Tarjeta), resuelve el dueño del vehículo.
  private async resolveOwnerFromVehicleDoc(document: Document): Promise<string | null> {
    if (!document.vehicleId) return null;
    const vehicle = await this.tripRepo.manager.createQueryBuilder('Vehicle', 'v')
      .where('v.id = :id', { id: document.vehicleId })
      .getRawOne();
    return vehicle ? vehicle.v_owner_user_id ?? vehicle.owner_user_id ?? null : null;
  }

  async getB2gReports() {
    // Readonly dashboard feed for MTC/ATU
    const complianceList = await this.tripRepo.manager.query(
      `SELECT * FROM chaski.v_vehicle_compliance LIMIT 50`
    );
    const demandList = await this.tripRepo.manager.query(
      `SELECT * FROM chaski.v_route_demand_30d LIMIT 50`
    );

    return {
      compliance: complianceList,
      routeDemand30d: demandList,
      audits: {
        lastDataSharingAgreement: 'ATU - ChaskiRutas signed on 2026-05-10',
        activeJurisdictionsCount: 6,
      },
    };
  }
}
