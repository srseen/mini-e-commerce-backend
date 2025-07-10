import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto, UpdateOrderStatusDto } from '../../dto/order.dto';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // User endpoints
  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Request() req, @Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(req.user.id, createOrderDto);
  }

  @Get('my-orders')
  @UseGuards(JwtAuthGuard)
  async getUserOrders(@Request() req, @Query() query: any) {
    return this.ordersService.findUserOrders(req.user.id, query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Request() req, @Param('id') id: string) {
    const order = await this.ordersService.findOne(id);

    // Check if user owns this order or is admin
    if (order.user.toString() !== req.user.id && req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Access denied');
    }

    return order;
  }

  // Admin endpoints
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async findAll(@Query() query: any) {
    return this.ordersService.findAll(query);
  }

  @Put(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async updateStatus(
    @Param('id') id: string,
    @Body() updateOrderStatusDto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(id, updateOrderStatusDto);
  }

  @Get('stats/overview')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async getOrderStats() {
    return this.ordersService.getOrderStats();
  }
}
