import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type OrderDocument = Order & Document;

@Schema()
export class OrderItem {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  quantity: number;

  @Prop()
  image: string;

  @Prop({ required: true })
  price: number;

  @Prop({ type: Types.ObjectId, ref: 'Product' })
  product: Types.ObjectId;
}

@Schema()
export class ShippingInfo {
  @Prop()
  address: string;

  @Prop()
  city: string;

  @Prop()
  postalCode: string;

  @Prop()
  country: string;
}

@Schema()
export class CouponApplied {
  @Prop()
  code: string;

  @Prop()
  discountAmount: number;
}

@Schema()
export class PaymentResult {
  @Prop()
  id: string;

  @Prop()
  status: string;

  @Prop()
  update_time: string;

  @Prop()
  email_address: string;
}

@Schema({ timestamps: true })
export class Order {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ type: [OrderItem], required: true })
  orderItems: OrderItem[];

  @Prop({ type: ShippingInfo })
  shippingInfo: ShippingInfo;

  @Prop({ type: CouponApplied })
  couponApplied: CouponApplied;

  @Prop({ required: true })
  itemsPrice: number;

  @Prop({ required: true, default: 0 })
  shippingPrice: number;

  @Prop({ required: true, default: 0 })
  taxPrice: number;

  @Prop({ required: true })
  totalPrice: number;

  @Prop({
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending',
  })
  status: string;

  @Prop({ type: PaymentResult })
  paymentResult: PaymentResult;

  @Prop()
  paidAt: Date;

  @Prop()
  deliveredAt: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
