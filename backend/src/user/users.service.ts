import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import * as TE from 'fp-ts/TaskEither';
import { UsersRepository } from './users.repository';
import { UserRole } from 'src/types/req-user.interface';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async createUser(data: {
    email: string;
    name: string;
    password: string;
    role?: UserRole;
  }) {
    try {
      return await this.usersRepository.createUser({
        ...data,
        balance: 0.0,
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (
          error.code === 'P2002' &&
          Array.isArray(error.meta?.target) &&
          error.meta.target.includes('email')
        ) {
          throw new ConflictException('Email already exists');
        }
      }
      throw new InternalServerErrorException('Failed to create user');
    }
  }

  async findByEmail(email: string) {
    const user = await this.usersRepository.findUserByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found by email in service');
    }
    return user;
  }

  async findUserById(id: number) {
    const user = await this.usersRepository.findUserById(id);
    if (!user) {
      throw new NotFoundException('User not found from service');
    }

    const { password, ...result } = user;
    return result;
  }

  getAllUsers(): TE.TaskEither<Error, any> {
    return TE.tryCatch(
      () => this.usersRepository.findAllUsers(),
      (reason) => new Error(`Failed to fetch users: ${String(reason)}`),
    );
  }

  async addBalance(userId: number, amount: number) {
    if (amount <= 0) {
      throw new InternalServerErrorException(
        'Amount must be greater than zero',
      );
    }

    const user = await this.usersRepository.findUserById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const newBalance = user.balance + amount;

    return this.usersRepository.updateUserBalance(userId, newBalance);
  }
}