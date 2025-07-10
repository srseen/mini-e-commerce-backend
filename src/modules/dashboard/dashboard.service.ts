import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument } from '../../schemas/order.schema';
import { Product, ProductDocument } from '../../schemas/product.schema';
import { User, UserDocument } from '../../schemas/user.schema';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async getSummary() {
    const today = new Date();
    const startOfToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );
    const startOfWeek = new Date(
      today.setDate(today.getDate() - today.getDay()),
    );
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    // Get sales data
    const [
      todaySales,
      weekSales,
      monthSales,
      yearSales,
      totalOrders,
      totalProducts,
      totalUsers,
      totalRevenue,
    ] = await Promise.all([
      this.getSalesForPeriod(startOfToday),
      this.getSalesForPeriod(startOfWeek),
      this.getSalesForPeriod(startOfMonth),
      this.getSalesForPeriod(startOfYear),
      this.orderModel.countDocuments(),
      this.productModel.countDocuments(),
      this.userModel.countDocuments({ role: 'USER' }),
      this.orderModel.aggregate([
        { $match: { status: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } },
      ]),
    ]);

    return {
      sales: {
        today: todaySales,
        week: weekSales,
        month: monthSales,
        year: yearSales,
      },
      totals: {
        orders: totalOrders,
        products: totalProducts,
        users: totalUsers,
        revenue: totalRevenue[0]?.total || 0,
      },
    };
  }

  async getSalesReport(startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const salesData = await this.orderModel.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          status: { $ne: 'cancelled' },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' },
          },
          totalSales: { $sum: '$totalPrice' },
          orderCount: { $sum: 1 },
        },
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 },
      },
    ]);

    const totalSales = await this.orderModel.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          status: { $ne: 'cancelled' },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalPrice' },
          totalOrders: { $sum: 1 },
          averageOrderValue: { $avg: '$totalPrice' },
        },
      },
    ]);

    return {
      dailySales: salesData,
      summary: totalSales[0] || {
        totalRevenue: 0,
        totalOrders: 0,
        averageOrderValue: 0,
      },
    };
  }

  async getTopProducts(limit: number = 10) {
    return this.orderModel.aggregate([
      { $unwind: '$orderItems' },
      {
        $group: {
          _id: '$orderItems.product',
          totalQuantity: { $sum: '$orderItems.quantity' },
          totalRevenue: {
            $sum: { $multiply: ['$orderItems.quantity', '$orderItems.price'] },
          },
          productName: { $first: '$orderItems.name' },
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product',
        },
      },
      {
        $project: {
          productId: '$_id',
          productName: '$productName',
          totalQuantity: 1,
          totalRevenue: 1,
          product: { $arrayElemAt: ['$product', 0] },
        },
      },
    ]);
  }

  async getSalesByCategory() {
    return this.orderModel.aggregate([
      { $unwind: '$orderItems' },
      {
        $lookup: {
          from: 'products',
          localField: 'orderItems.product',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: '$product' },
      {
        $lookup: {
          from: 'categories',
          localField: 'product.category',
          foreignField: '_id',
          as: 'category',
        },
      },
      { $unwind: '$category' },
      {
        $group: {
          _id: '$category._id',
          categoryName: { $first: '$category.name' },
          totalQuantity: { $sum: '$orderItems.quantity' },
          totalRevenue: {
            $sum: { $multiply: ['$orderItems.quantity', '$orderItems.price'] },
          },
        },
      },
      { $sort: { totalRevenue: -1 } },
    ]);
  }

  async getUserGrowth() {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    return this.userModel.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo },
          role: 'USER',
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          newUsers: { $sum: 1 },
        },
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 },
      },
    ]);
  }

  async getInventoryOverview() {
    const [totalProducts, lowStockProducts, outOfStockProducts, categoryStats] =
      await Promise.all([
        this.productModel.countDocuments({ status: 'active' }),
        this.productModel.countDocuments({
          stock: { $lte: 10, $gt: 0 },
          status: 'active',
        }),
        this.productModel.countDocuments({ stock: 0 }),
        this.productModel.aggregate([
          {
            $lookup: {
              from: 'categories',
              localField: 'category',
              foreignField: '_id',
              as: 'category',
            },
          },
          { $unwind: '$category' },
          {
            $group: {
              _id: '$category._id',
              categoryName: { $first: '$category.name' },
              productCount: { $sum: 1 },
              totalStock: { $sum: '$stock' },
            },
          },
        ]),
      ]);

    return {
      totalProducts,
      lowStockProducts,
      outOfStockProducts,
      categoryStats,
    };
  }

  private async getSalesForPeriod(startDate: Date) {
    const result = await this.orderModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: { $ne: 'cancelled' },
        },
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: '$totalPrice' },
          orderCount: { $sum: 1 },
        },
      },
    ]);

    return result[0] || { totalSales: 0, orderCount: 0 };
  }
}
