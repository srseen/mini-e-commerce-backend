import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProductDocument = Product & Document;

@Schema({ timestamps: true })
export class Product {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true, unique: true })
  slug: string;

  @Prop({ required: true })
  description: string;

  @Prop()
  richDescription: string;

  @Prop()
  brand: string;

  @Prop({ required: true })
  price: number;

  @Prop()
  salePrice: number;

  @Prop({ type: Types.ObjectId, ref: 'Category', required: true })
  category: Types.ObjectId;

  @Prop({ required: true, default: 0 })
  stock: number;

  @Prop({ type: [String], default: [] })
  images: string[];

  @Prop({ default: false })
  isFeatured: boolean;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Review' }], default: [] })
  reviews: Types.ObjectId[];

  @Prop({ default: 0 })
  ratings: number;

  @Prop({ default: 0 })
  numReviews: number;

  @Prop({
    enum: ['active', 'inactive', 'out-of-stock'],
    default: 'active',
  })
  status: string;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
