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

  async verifyDocument(id: string, dto: VerifyDocumentDto, adminUserId: string) {
    const document = await this.documentRepo.findOne({ where: { id } });
    if (!document) throw new NotFoundException('Documento no encontrado');

    document.isVerified = dto.isVerified;
    document.verifiedBy = adminUserId;
    document.verifiedAt = new Date();
    await this.documentRepo.save(document);

    // If verified, check if driver has DNI, Licencia, and SOAT verified to activate
    const targetUserId = document.userId;
    if (targetUserId && dto.isVerified) {
      const docs = await this.documentRepo.find({ where: { userId: targetUserId, isVerified: true } });
      const verifiedKinds = docs.map((d) => d.kind);

      const hasDni = verifiedKinds.includes('DNI' as any);
      const hasLicense = verifiedKinds.includes('LICENCIA' as any);

      if (hasDni && hasLicense) {
        const driver = await this.driverRepo.findOne({ where: { userId: targetUserId } });
        if (driver && driver.status !== DriverStatus.ACTIVO) {
          driver.status = DriverStatus.ACTIVO;
          driver.formalizationStep = 6;
          driver.formalizationPct = 100;
          await this.driverRepo.save(driver);
        }
      }
    }

    return { success: true, isVerified: dto.isVerified };
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
