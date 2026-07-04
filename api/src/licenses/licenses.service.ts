import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { License, LicenseStatus } from '../entities/license.entity';

@Injectable()
export class LicensesService {
  constructor(@InjectRepository(License) private readonly licenses: Repository<License>) {}

  findAll(): Promise<License[]> {
    return this.licenses.find({ order: { createdAt: 'DESC' } });
  }

  findForTenant(tenantId: string): Promise<License[]> {
    return this.licenses.find({ where: { tenantId }, order: { createdAt: 'DESC' } });
  }

  create(data: Partial<License>): Promise<License> {
    return this.licenses.save(this.licenses.create(data));
  }

  async updateSeats(id: string, seats: number): Promise<License> {
    const license = await this.licenses.findOneBy({ id });
    if (!license) throw new NotFoundException('Lisans bulunamadı');
    license.seats = seats;
    return this.licenses.save(license);
  }

  async cancel(id: string): Promise<License> {
    const license = await this.licenses.findOneBy({ id });
    if (!license) throw new NotFoundException('Lisans bulunamadı');
    license.status = LicenseStatus.CANCELLED;
    return this.licenses.save(license);
  }
}
