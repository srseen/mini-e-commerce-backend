import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument } from '../../schemas/order.schema';
import { Product, ProductDocument } from '../../schemas/product.schema';
import { CreateOrderDto, UpdateOrderStatusDto } from '../../dto/order.dto';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
  ) {}

  async create(userId: string, createOrderDto: CreateOrderDto): Promise<Order> {
    // Validate stock for each product
    for (const item of createOrderDto.orderItems) {
      const product = await this.productModel.findById(item.product);
      if (!product) {
        throw new BadRequestException(`Product ${item.product} not found`);
      }

      if (product.stock < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for product ${product.name}`,
        );
      }
    }

    // Create order
    const order = new this.orderModel({
      ...createOrderDto,
      user: userId,
    });

    const savedOrder = await order.save();

    // Update product stock
    for (const item of createOrderDto.orderItems) {
      await this.productModel.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity },
      });
    }

    const populatedOrder = await this.orderModel
      .findById(savedOrder._id)
      .populate('user', 'name email')
      .populate('orderItems.product', 'name price images')
      .exec();

    return populatedOrder!;
  }

  async findAll(query: any = {}): Promise<{
    orders: Order[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 10, status, user } = query;

    const filter: any = {};

    if (status) {
      filter.status = status;
    }

    if (user) {
      filter.user = user;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [orders, total] = await Promise.all([
      this.orderModel
        .find(filter)
        .populate('user', 'name email')
        .populate('orderItems.product', 'name price images')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .exec(),
      this.orderModel.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / Number(limit));

    return {
      orders,
      total,
      page: Number(page),
      totalPages,
    };
  }

  async findOne(id: string): Promise<Order> {
    const order = await this.orderModel
      .findById(id)
      .populate('user', 'name email')
      .populate('orderItems.product', 'name price images')
      .exec();

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async findUserOrders(
    userId: string,
    query: any = {},
  ): Promise<{
    orders: Order[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 10, status } = query;

    const filter: any = { user: userId };

    if (status) {
      filter.status = status;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [orders, total] = await Promise.all([
      this.orderModel
        .find(filter)
        .populate('orderItems.product', 'name price images')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .exec(),
      this.orderModel.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / Number(limit));

    return {
      orders,
      total,
      page: Number(page),
      totalPages,
    };
  }

  async updateStatus(
    id: string,
    updateOrderStatusDto: UpdateOrderStatusDto,
  ): Promise<Order> {
    const order = await this.orderModel
      .findByIdAndUpdate(
        id,
        {
          status: updateOrderStatusDto.status,
          ...(updateOrderStatusDto.status === 'delivered' && {
            deliveredAt: new Date(),
          }),
        },
        { new: true },
      )
      .populate('user', 'name email')
      .populate('orderItems.product', 'name price images')
      .exec();

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async getOrderStats() {
    const stats = await this.orderModel.aggregate([
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$totalPrice' },
          averageOrderValue: { $avg: '$totalPrice' },
        },
      },
    ]);

    const statusStats = await this.orderModel.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    return {
      ...stats[0],
      statusBreakdown: statusStats.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
    };
  }
}
