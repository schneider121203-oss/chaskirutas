import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, Passenger, TrustedContact } from '../entities';
import { UpdateUserDto, UpdatePassengerDto, CreateContactDto } from './dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Passenger)
    private readonly passengerRepo: Repository<Passenger>,
    @InjectRepository(TrustedContact)
    private readonly contactRepo: Repository<TrustedContact>,
  ) {}

  async updateUser(userId: string, dto: UpdateUserDto) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    if (dto.email !== undefined) user.email = dto.email;
    if (dto.fullName !== undefined) user.fullName = dto.fullName;
    if (dto.photoUrl !== undefined) user.photoUrl = dto.photoUrl;
    user.updatedAt = new Date();

    return this.userRepo.save(user);
  }

  async updatePassenger(userId: string, dto: UpdatePassengerDto) {
    const passenger = await this.passengerRepo.findOne({ where: { userId } });
    if (!passenger) throw new NotFoundException('Perfil de pasajero no encontrado');

    if (dto.homeAddress !== undefined) passenger.homeAddress = dto.homeAddress;
    if (dto.workAddress !== undefined) passenger.workAddress = dto.workAddress;
    if (dto.preferredPaymentMethodId !== undefined) {
      passenger.preferredPaymentMethodId = dto.preferredPaymentMethodId;
    }

    return this.passengerRepo.save(passenger);
  }

  async getContacts(userId: string) {
    return this.contactRepo.find({
      where: { passengerId: userId },
      order: { isPrimary: 'DESC', createdAt: 'DESC' },
    });
  }

  async addContact(userId: string, dto: CreateContactDto) {
    const contact = this.contactRepo.create({
      passengerId: userId,
      fullName: dto.fullName,
      relationship: dto.relationship || null,
      phoneE164: dto.phoneE164,
      isPrimary: dto.isPrimary || false,
    });
    return this.contactRepo.save(contact);
  }

  async deleteContact(userId: string, contactId: string) {
    const contact = await this.contactRepo.findOne({
      where: { id: contactId, passengerId: userId },
    });
    if (!contact) throw new NotFoundException('Contacto no encontrado');
    await this.contactRepo.remove(contact);
    return { success: true };
  }
}
