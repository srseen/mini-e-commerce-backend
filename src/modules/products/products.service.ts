import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, ProductDocument } from '../../schemas/product.schema';
import { CreateProductDto, UpdateProductDto } from '../../dto/product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
  ) {}

  async create(createProductDto: CreateProductDto): Promise<Product> {
    // Check if product with same name or slug exists
    const existingProduct = await this.productModel.findOne({
      $or: [{ name: createProductDto.name }, { slug: createProductDto.slug }],
    });

    if (existingProduct) {
      throw new ConflictException(
        'Product with this name or slug already exists',
      );
    }

    const product = new this.productModel(createProductDto);
    return product.save();
  }

  async findAll(query: any = {}): Promise<{
    products: Product[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const {
      page = 1,
      limit = 10,
      category,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      minPrice,
      maxPrice,
      featured,
    } = query;

    // Build filter object
    const filter: any = {};

    if (category) {
      filter.category = category;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
      ];
    }

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    if (featured !== undefined) {
      filter.isFeatured = featured === 'true';
    }

    // Add active status filter
    filter.status = 'active';

    // Build sort object
    const sort: any = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const skip = (Number(page) - 1) * Number(limit);

    const [products, total] = await Promise.all([
      this.productModel
        .find(filter)
        .populate('category', 'name slug')
        .sort(sort)
        .skip(skip)
        .limit(Number(limit))
        .exec(),
      this.productModel.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / Number(limit));

    return {
      products,
      total,
      page: Number(page),
      totalPages,
    };
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.productModel
      .findById(id)
      .populate('category', 'name slug')
      .exec();

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async findBySlug(slug: string): Promise<Product> {
    const product = await this.productModel
      .findOne({ slug })
      .populate('category', 'name slug')
      .exec();

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
  ): Promise<Product> {
    // Check if updating name or slug conflicts with existing products
    if (updateProductDto.name || updateProductDto.slug) {
      const existingProduct = await this.productModel.findOne({
        _id: { $ne: id },
        $or: [{ name: updateProductDto.name }, { slug: updateProductDto.slug }],
      });

      if (existingProduct) {
        throw new ConflictException(
          'Product with this name or slug already exists',
        );
      }
    }

    const product = await this.productModel
      .findByIdAndUpdate(id, updateProductDto, { new: true })
      .populate('category', 'name slug')
      .exec();

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async remove(id: string): Promise<void> {
    const result = await this.productModel.findByIdAndDelete(id);
    if (!result) {
      throw new NotFoundException('Product not found');
    }
  }

  async getFeaturedProducts(limit: number = 8): Promise<Product[]> {
    return this.productModel
      .find({ isFeatured: true, status: 'active' })
      .populate('category', 'name slug')
      .limit(limit)
      .exec();
  }

  async updateStock(id: string, quantity: number): Promise<Product> {
    const product = await this.productModel.findByIdAndUpdate(
      id,
      { $inc: { stock: -quantity } },
      { new: true },
    );

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Update status if out of stock
    if (product.stock <= 0) {
      product.status = 'out-of-stock';
      await product.save();
    }

    return product;
  }
}
