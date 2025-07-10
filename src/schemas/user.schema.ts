import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ _id: false })
export class ShippingAddress {
  @Prop()
  street: string;

  @Prop()
  city: string;

  @Prop()
  postalCode: string;

  @Prop()
  country: string;
}

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({
    enum: ['USER', 'ADMIN', 'CEO'],
    default: 'USER',
  })
  role: string;

  @Prop({ type: ShippingAddress })
  shippingAddress: ShippingAddress;
}

export const UserSchema = SchemaFactory.createForClass(User);
