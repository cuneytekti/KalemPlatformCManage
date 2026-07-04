import { Controller, Get } from '@nestjs/common';
import { DockerService } from '../provisioning/docker.service';

@Controller('system')
export class SystemController {
  constructor(private readonly docker: DockerService) {}

  @Get('stats')
  stats() {
    return this.docker.systemStats();
  }
}
