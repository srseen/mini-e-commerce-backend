import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from '../../schemas/user.schema';
import {
  CreateUserDto,
  UpdateUserDto,
  UpdateUserRoleDto,
} from '../../dto/user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    // Check if user already exists
    const existingUser = await this.userModel.findOne({
      email: createUserDto.email,
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(
      createUserDto.password,
      saltRounds,
    );

    const user = new this.userModel({
      ...createUserDto,
      password: hashedPassword,
      role: createUserDto.role || 'USER',
    });

    const savedUser = await user.save();

    // Return user without password
    const userObject = savedUser.toObject() as User;
    const { password, ...userWithoutPassword } = userObject;
    return userWithoutPassword as User;
  }

  async findAll(query: any = {}): Promise<{
    users: User[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 10, search, role } = query;

    const filter: any = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    if (role) {
      filter.role = role;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [users, total] = await Promise.all([
      this.userModel
        .find(filter)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .exec(),
      this.userModel.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / Number(limit));

    return {
      users,
      total,
      page: Number(page),
      totalPages,
    };
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userModel.findById(id).select('-password').exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    // Check if email is being updated and conflicts with existing users
    if (updateUserDto.email) {
      const existingUser = await this.userModel.findOne({
        _id: { $ne: id },
        email: updateUserDto.email,
      });

      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }
    }

    const user = await this.userModel
      .findByIdAndUpdate(id, updateUserDto, { new: true })
      .select('-password')
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateRole(
    id: string,
    updateUserRoleDto: UpdateUserRoleDto,
  ): Promise<User> {
    const user = await this.userModel
      .findByIdAndUpdate(id, { role: updateUserRoleDto.role }, { new: true })
      .select('-password')
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async remove(id: string): Promise<void> {
    const result = await this.userModel.findByIdAndDelete(id);
    if (!result) {
      throw new NotFoundException('User not found');
    }
  }

  async getUserStats() {
    const [totalUsers, usersByRole, recentUsers, userGrowth] = await Promise.all([
      this.userModel.countDocuments(),
      this.userModel.aggregate([
        {
          $group: {
            _id: '$role',
            count: { $sum: 1 },
          },
        },
      ]),
      this.userModel
        .find()
        .select('-password')
        .sort({ createdAt: -1 })
        .limit(5)
        .exec(),
      this.getUserGrowthStats(),
    ]);

    const roleStats = usersByRole.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {});

    return {
      totalUsers,
      roleStats,
      recentUsers,
      userGrowth,
    };
  }

  private async getUserGrowthStats() {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    return this.userModel.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo },
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
}