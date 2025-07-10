import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  IsEnum,
  IsMongoId,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class OrderItemDto {
  @IsString()
  name: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsString()
  image?: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsMongoId()
  product: string;
}

export class ShippingInfoDto {
  @IsString()
  address: string;

  @IsString()
  city: string;

  @IsString()
  postalCode: string;

  @IsString()
  country: string;
}

export class CouponAppliedDto {
  @IsString()
  code: string;

  @IsNumber()
  @Min(0)
  discountAmount: number;
}

export class CreateOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  orderItems: OrderItemDto[];

  @ValidateNested()
  @Type(() => ShippingInfoDto)
  shippingInfo: ShippingInfoDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CouponAppliedDto)
  couponApplied?: CouponAppliedDto;

  @IsNumber()
  @Min(0)
  itemsPrice: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  shippingPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxPrice?: number;

  @IsNumber()
  @Min(0)
  totalPrice: number;
}

export class UpdateOrderStatusDto {
  @IsEnum(['pending', 'processing', 'shipped', 'delivered', 'cancelled'])
  status: string;
}
