import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CouponDocument = Coupon & Document;

@Schema({ timestamps: true })
export class Coupon {
  @Prop({ required: true, unique: true, uppercase: true })
  code: string;

  @Prop({
    enum: ['percentage', 'fixed'],
    required: true,
  })
  discountType: string;

  @Prop({ required: true })
  discountValue: number;

  @Prop({ required: true })
  expiryDate: Date;

  @Prop()
  minPurchase: number;

  @Prop({ default: true })
  isActive: boolean;
}

export const CouponSchema = SchemaFactory.createForClass(Coupon);
