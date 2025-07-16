import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import {
  CreateUserDto,
  UpdateUserDto,
  UpdateUserRoleDto,
} from '../../dto/user.dto';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Admin/CEO endpoints
  @Get()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'CEO')
  async findAll(@Query() query: any) {
    return this.usersService.findAll(query);
  }

  @Get('stats/overview')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'CEO')
  async getUserStats() {
    return this.usersService.getUserStats();
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'CEO')
  async findOne(@Param('id') id: string, @Request() req) {
    // Users can view their own profile, admins can view any profile
    if (req.user.id !== id && !['ADMIN', 'CEO'].includes(req.user.role)) {
      throw new ForbiddenException('Access denied');
    }
    return this.usersService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'CEO')
  async create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'CEO')
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Request() req,
  ) {
    // Prevent non-CEO from updating CEO accounts
    const targetUser = await this.usersService.findOne(id);
    if (targetUser.role === 'CEO' && req.user.role !== 'CEO') {
      throw new ForbiddenException('Cannot modify CEO account');
    }

    // Prevent non-CEO from creating CEO accounts
    if (updateUserDto.role === 'CEO' && req.user.role !== 'CEO') {
      throw new ForbiddenException('Cannot assign CEO role');
    }

    return this.usersService.update(id, updateUserDto);
  }

  @Put(':id/role')
  @UseGuards(RolesGuard)
  @Roles('CEO')
  async updateRole(
    @Param('id') id: string,
    @Body() updateUserRoleDto: UpdateUserRoleDto,
  ) {
    return this.usersService.updateRole(id, updateUserRoleDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('CEO')
  async remove(@Param('id') id: string, @Request() req) {
    // Prevent deleting own account
    if (req.user.id === id) {
      throw new ForbiddenException('Cannot delete your own account');
    }

    await this.usersService.remove(id);
    return { message: 'User deleted successfully' };
  }
}