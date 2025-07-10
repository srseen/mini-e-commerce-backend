import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Coupon, CouponDocument } from '../../schemas/coupon.schema';
import {
  CreateCouponDto,
  UpdateCouponDto,
  ValidateCouponDto,
} from '../../dto/coupon.dto';

@Injectable()
export class CouponsService {
  constructor(
    @InjectModel(Coupon.name) private couponModel: Model<CouponDocument>,
  ) {}

  async create(createCouponDto: CreateCouponDto): Promise<Coupon> {
    // Check if coupon with same code exists
    const existingCoupon = await this.couponModel.findOne({
      code: createCouponDto.code.toUpperCase(),
    });

    if (existingCoupon) {
      throw new ConflictException('Coupon with this code already exists');
    }

    const coupon = new this.couponModel({
      ...createCouponDto,
      code: createCouponDto.code.toUpperCase(),
    });

    return coupon.save();
  }

  async findAll(): Promise<Coupon[]> {
    return this.couponModel.find().sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string): Promise<Coupon> {
    const coupon = await this.couponModel.findById(id).exec();
    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }
    return coupon;
  }

  async update(id: string, updateCouponDto: UpdateCouponDto): Promise<Coupon> {
    // Check if updating code conflicts with existing coupons
    if (updateCouponDto.code) {
      const existingCoupon = await this.couponModel.findOne({
        _id: { $ne: id },
        code: updateCouponDto.code.toUpperCase(),
      });

      if (existingCoupon) {
        throw new ConflictException('Coupon with this code already exists');
      }
    }

    const updateData = {
      ...updateCouponDto,
      ...(updateCouponDto.code && { code: updateCouponDto.code.toUpperCase() }),
    };

    const coupon = await this.couponModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();

    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    return coupon;
  }

  async remove(id: string): Promise<void> {
    const result = await this.couponModel.findByIdAndDelete(id);
    if (!result) {
      throw new NotFoundException('Coupon not found');
    }
  }

  async validateCoupon(
    validateCouponDto: ValidateCouponDto,
  ): Promise<{ isValid: boolean; discount: number; message?: string }> {
    const { code, orderTotal } = validateCouponDto;

    const coupon = await this.couponModel.findOne({
      code: code.toUpperCase(),
      isActive: true,
    });

    if (!coupon) {
      return {
        isValid: false,
        discount: 0,
        message: 'Invalid coupon code',
      };
    }

    // Check if coupon is expired
    if (new Date() > coupon.expiryDate) {
      return {
        isValid: false,
        discount: 0,
        message: 'Coupon has expired',
      };
    }

    // Check minimum purchase requirement
    if (coupon.minPurchase && orderTotal < coupon.minPurchase) {
      return {
        isValid: false,
        discount: 0,
        message: `Minimum purchase of $${coupon.minPurchase} required`,
      };
    }

    // Calculate discount
    let discount = 0;
    if (coupon.discountType === 'percentage') {
      discount = (orderTotal * coupon.discountValue) / 100;
    } else {
      discount = coupon.discountValue;
    }

    // Ensure discount doesn't exceed order total
    discount = Math.min(discount, orderTotal);

    return {
      isValid: true,
      discount,
      message: 'Coupon applied successfully',
    };
  }

  async getActiveCoupons(): Promise<Coupon[]> {
    return this.couponModel
      .find({
        isActive: true,
        expiryDate: { $gt: new Date() },
      })
      .sort({ createdAt: -1 })
      .exec();
  }
}
