import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('CEO')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  async getSummary() {
    return this.dashboardService.getSummary();
  }

  @Get('sales-report')
  async getSalesReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.dashboardService.getSalesReport(startDate, endDate);
  }

  @Get('top-products')
  async getTopProducts(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit) : 10;
    return this.dashboardService.getTopProducts(limitNum);
  }

  @Get('sales-by-category')
  async getSalesByCategory() {
    return this.dashboardService.getSalesByCategory();
  }

  @Get('user-growth')
  async getUserGrowth() {
    return this.dashboardService.getUserGrowth();
  }

  @Get('inventory-overview')
  async getInventoryOverview() {
    return this.dashboardService.getInventoryOverview();
  }
}
