import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CatalogsService } from './catalogs.service';

@ApiTags('Catalogs')
@Controller('catalogs')
export class CatalogsController {
  constructor(private readonly catalogsService: CatalogsService) {}

  @Get('departments')
  @ApiOperation({ summary: 'Obtener lista de departamentos' })
  getDepartments() {
    return this.catalogsService.getDepartments();
  }

  @Get('departments/:deptId/provinces')
  @ApiOperation({ summary: 'Obtener provincias de un departamento' })
  getProvinces(@Param('deptId', ParseIntPipe) deptId: number) {
    return this.catalogsService.getProvinces(deptId);
  }

  @Get('provinces/:provId/districts')
  @ApiOperation({ summary: 'Obtener distritos de una provincia' })
  getDistricts(@Param('provId', ParseIntPipe) provId: number) {
    return this.catalogsService.getDistricts(provId);
  }

  @Get('jurisdictions')
  @ApiOperation({ summary: 'Obtener entidades regulatorias' })
  getJurisdictions() {
    return this.catalogsService.getJurisdictions();
  }
}
